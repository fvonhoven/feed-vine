import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

serve(async req => {
  console.log("=== create-portal-session called ===")
  console.log("Method:", req.method)

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight - returning 200")
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    console.log("Supabase URL:", supabaseUrl)
    console.log("Has anon key:", !!supabaseAnonKey)
    console.log("Has service key:", !!supabaseServiceKey)

    // Log all headers
    console.log("Request headers:")
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase() === "authorization") {
        console.log(`  ${key}: Bearer ***`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")
    console.log("Auth header present:", !!authHeader)

    if (!authHeader) {
      console.log("ERROR: No authorization header")
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    console.log("Creating Supabase client with auth header...")
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    console.log("Calling supabase.auth.getUser()...")
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("getUser result - user:", !!user, "error:", userError?.message)

    if (userError || !user) {
      console.log("ERROR: User auth failed:", userError?.message)
      return new Response(JSON.stringify({ error: "Unauthorized", details: userError?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const userId = user.id
    console.log("User authenticated:", userId)

    const { returnUrl } = await req.json()

    if (!returnUrl) {
      throw new Error("Missing required parameter: returnUrl")
    }

    // Get user's subscription to find Stripe customer ID
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: subscription, error: subError } = await supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).single()

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
