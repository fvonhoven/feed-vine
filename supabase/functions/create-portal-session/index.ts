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

    const { returnUrl } = await req.json()

    if (!returnUrl) {
      throw new Error("Missing required parameter: returnUrl")
    }

    // Get user's subscription to find Stripe customer ID
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
    const { data: subscription, error: subError } = await supabaseClient.from("subscriptions").select("*").eq("user_id", userId).single()

    if (subError || !subscription) {
      throw new Error("No subscription found")
    }

    if (!subscription.stripe_customer_id) {
      throw new Error("No Stripe customer ID found")
    }

    // Create Stripe Customer Portal session
    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("Stripe portal session error:", errorBody)
      throw new Error(`Failed to create portal session: ${response.status}`)
    }

    const session = await response.json()

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error("Create portal session error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})

