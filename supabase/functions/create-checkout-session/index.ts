/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "jsr:@supabase/supabase-js@2"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || ""

// Helper function to call Stripe API directly
async function createStripeCheckoutSession(params: {
  customer?: string
  line_items: Array<{ price: string; quantity: number }>
  mode: string
  success_url: string
  cancel_url: string
  metadata?: Record<string, string>
}) {
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-11-20.acacia", // Pin API version for consistency
    },
    body: new URLSearchParams({
      ...(params.customer && { customer: params.customer }),
      "line_items[0][price]": params.line_items[0].price,
      "line_items[0][quantity]": params.line_items[0].quantity.toString(),
      mode: params.mode,
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      ...(params.metadata &&
        Object.entries(params.metadata).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [`metadata[${key}]`]: value,
          }),
          {},
        )),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Stripe API error:", response.status, errorText)
    // Don't expose internal Stripe errors to client
    throw new Error(`Payment processing failed. Please try again.`)
  }

  const data = await response.json()

  // Validate response has expected fields
  if (!data.id || !data.url) {
    console.error("Invalid Stripe response:", data)
    throw new Error("Invalid payment session response")
  }

  return data
}

async function createStripeCustomer(params: { email?: string; metadata?: Record<string, string> }) {
  const response = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-11-20.acacia", // Pin API version for consistency
    },
    body: new URLSearchParams({
      ...(params.email && { email: params.email }),
      ...(params.metadata &&
        Object.entries(params.metadata).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [`metadata[${key}]`]: value,
          }),
          {},
        )),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Stripe customer creation error:", response.status, errorText)
    // Don't expose internal Stripe errors to client
    throw new Error(`Customer creation failed. Please try again.`)
  }

  const data = await response.json()

  // Validate response has expected fields
  if (!data.id) {
    console.error("Invalid Stripe customer response:", data)
    throw new Error("Invalid customer response")
  }

  return data
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async req => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization")
    console.log("Authorization header present:", !!authHeader)

    if (!authHeader) {
      console.error("Missing authorization header")
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    console.log("Auth error:", authError)
    console.log("User authenticated:", !!user)

    if (authError || !user) {
      console.error("Authentication failed:", authError?.message || "No user found")
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          details: authError?.message || "No user found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      )
    }

    const { priceId } = await req.json()

    if (!priceId) {
      throw new Error("Missing required parameter: priceId")
    }

    // Validate priceId format (Stripe price IDs start with "price_")
    if (typeof priceId !== "string" || !priceId.startsWith("price_")) {
      console.error("Invalid priceId format:", priceId)
      throw new Error("Invalid price ID format")
    }

    // Additional length check to prevent excessively long inputs
    if (priceId.length > 100) {
      console.error("PriceId too long:", priceId.length)
      throw new Error("Invalid price ID")
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseAdmin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).single()

    let customerId = subscription?.stripe_customer_id

    // Create new customer if doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      // Save customer ID to database
      await supabaseAdmin.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan_id: "free",
        status: "active",
      })
    }

    // Validate origin header to prevent open redirect
    const origin = req.headers.get("origin")
    const allowedOrigins = [
      "https://feedvine.app",
      "https://www.feedvine.app",
      "http://localhost:5173", // Local development
      "http://localhost:4173", // Local preview
    ]

    if (!origin || !allowedOrigins.includes(origin)) {
      console.error("Invalid origin:", origin)
      throw new Error("Invalid request origin")
    }

    // Create Checkout Session
    const session = await createStripeCheckoutSession({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/settings?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
