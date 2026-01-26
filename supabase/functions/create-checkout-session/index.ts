import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

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
    // Get the authorization header for user verification
    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    // Verify user via Supabase Auth API
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

    console.log("Supabase URL:", supabaseUrl)
    console.log("Auth header present:", !!authHeader)

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    })

    console.log("Auth API response status:", userResponse.status)

    if (!userResponse.ok) {
      const errorBody = await userResponse.text()
      console.error("Auth API error:", errorBody)
      return new Response(JSON.stringify({ error: "Unauthorized", details: errorBody }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const user = await userResponse.json()
    console.log("User verified:", user.id)
    const userId = user.id
    const userEmail = user.email

    const { priceId } = await req.json()

    if (!priceId) {
      throw new Error("Missing required parameter: priceId")
    }

    // Get or create Stripe customer using custom lightweight client
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseClient.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).single()

    let customerId = subscription?.stripe_customer_id

    // Create new customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: userId,
        },
      })

      customerId = customer.id

      // Save customer ID to database
      await supabaseClient.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        plan_id: "free",
        status: "active",
      })
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/settings?success=true`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      metadata: {
        user_id: userId,
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Checkout error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})

// Lightweight Supabase client helper using fetch (no SDK dependencies)
function createClient(supabaseUrl: string, supabaseKey: string) {
  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => ({
          single: async () => {
            const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            })
            const data = await response.json()
            return { data: data[0] || null }
          },
        }),
      }),
      upsert: async (data: any) => {
        await fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(data),
        })
        return { data: null, error: null }
      },
    }),
  }
}
