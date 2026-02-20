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

    const { newPlanId, interval } = await req.json()

    if (!newPlanId) {
      throw new Error("Missing required parameter: newPlanId")
    }

    // Get user's subscription
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (subError || !subscription) {
      throw new Error("No active subscription found")
    }

    if (!subscription.stripe_subscription_id) {
      throw new Error("No Stripe subscription ID found - user may be on free plan")
    }

    // Get current subscription from Stripe
    const currentSubResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`,
      {
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    )

    if (!currentSubResponse.ok) {
      throw new Error("Failed to fetch current subscription from Stripe")
    }

    const currentSub = await currentSubResponse.json()
    const subscriptionItemId = currentSub.items.data[0].id
    const currentInterval = currentSub.items.data[0]?.price.recurring?.interval // "month" or "year"

    // Determine new price ID based on plan and interval
    // Use the interval from request, or fall back to current subscription interval
    const useAnnual = interval === "annual" || (interval === undefined && currentInterval === "year")

    let newPriceId: string | null = null

    if (newPlanId === "pro") {
      newPriceId = useAnnual
        ? Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")!
        : Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID")!
    } else if (newPlanId === "plus") {
      newPriceId = useAnnual
        ? Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")!
        : Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID")!
    } else if (newPlanId === "premium") {
      newPriceId = useAnnual
        ? Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")!
        : Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID")!
    }

    if (!newPriceId) {
      throw new Error("Invalid plan ID or price not configured")
    }

    // Update subscription with proration
    // This will immediately charge/credit the prorated amount
    const updateResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscription.stripe_subscription_id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          [`items[0][id]`]: subscriptionItemId,
          [`items[0][price]`]: newPriceId,
          proration_behavior: "create_prorations", // Credit remaining time, charge new plan
          payment_behavior: "error_if_incomplete", // Fail if payment doesn't go through
        }),
      }
    )

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text()
      console.error("Stripe subscription update error:", errorBody)
      throw new Error(`Failed to upgrade subscription: ${updateResponse.status}`)
    }

    const updatedSubscription = await updateResponse.json()

    // The webhook will handle updating the database, but we can return success now
    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully upgraded to ${newPlanId}! Your account has been updated.`,
        subscription_id: updatedSubscription.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Upgrade error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})

