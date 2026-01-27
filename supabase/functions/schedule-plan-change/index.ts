import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const authHeader = req.headers.get("Authorization")!

    // Verify user authentication
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
      },
    })

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const user = await userResponse.json()
    const userId = user.id

    const { newPlanId } = await req.json()

    if (!newPlanId) {
      throw new Error("Missing required parameter: newPlanId")
    }

    // Get user's subscription
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: subscription, error: subError } = await supabaseClient.from("subscriptions").select("*").eq("user_id", userId).single()

    if (subError || !subscription) {
      throw new Error("No active subscription found")
    }

    if (!subscription.stripe_subscription_id) {
      throw new Error("No Stripe subscription ID found")
    }

    // Handle downgrade to free (cancel subscription)
    if (newPlanId === "free") {
      // Cancel subscription at period end
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          cancel_at_period_end: "true",
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error("Stripe cancellation error:", errorBody)
        throw new Error(`Failed to schedule cancellation: ${response.status}`)
      }

      const updatedSubscription = await response.json()

      // Update database to reflect cancel_at_period_end
      await supabaseClient.from("subscriptions").update({ cancel_at_period_end: true }).eq("user_id", userId)

      return new Response(
        JSON.stringify({
          success: true,
          message: `Subscription will be canceled on ${new Date(updatedSubscription.current_period_end * 1000).toLocaleDateString()}`,
          cancel_at: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      )
    }

    // Handle downgrade to lower paid tier
    // Get the new price ID based on current billing interval
    const proPrices = [Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")].filter(Boolean)
    const plusPrices = [Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")].filter(Boolean)
    const premiumPrices = [Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")].filter(Boolean)

    // Get current subscription from Stripe to determine billing interval
    const currentSubResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`, {
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      },
    })

    if (!currentSubResponse.ok) {
      throw new Error("Failed to fetch current subscription from Stripe")
    }

    const currentSub = await currentSubResponse.json()
    const currentPriceId = currentSub.items.data[0]?.price.id
    const currentInterval = currentSub.items.data[0]?.price.recurring?.interval // "month" or "year"

    // Determine new price ID
    let newPriceId: string | null = null
    const isAnnual = currentInterval === "year"

    if (newPlanId === "pro") {
      newPriceId = isAnnual ? Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")! : Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID")!
    } else if (newPlanId === "plus") {
      newPriceId = isAnnual ? Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")! : Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID")!
    } else if (newPlanId === "premium") {
      newPriceId = isAnnual ? Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")! : Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID")!
    }

    if (!newPriceId) {
      throw new Error("Invalid plan ID or price not configured")
    }

    // Schedule subscription change at period end
    const subscriptionItemId = currentSub.items.data[0].id

    // Update subscription to change at period end
    // We'll update the subscription with the new price but set it to take effect at period end
    const updateResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        [`items[0][id]`]: subscriptionItemId,
        [`items[0][price]`]: newPriceId,
        proration_behavior: "none", // No proration
        billing_cycle_anchor: "unchanged", // Keep current billing cycle
      }),
    })

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text()
      console.error("Stripe subscription update error:", errorBody)
      throw new Error(`Failed to schedule plan change: ${updateResponse.status}`)
    }

    const updatedSubscription = await updateResponse.json()

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plan will change to ${newPlanId} on ${new Date(updatedSubscription.current_period_end * 1000).toLocaleDateString()}`,
        effective_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error("Schedule plan change error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
