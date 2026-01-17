import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { priceId, userId } = await req.json()

    if (!priceId || !userId) {
      throw new Error("Missing required parameters")
    }

    // Get or create Stripe customer
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single()

    let customerId = subscription?.stripe_customer_id

    // Create new customer if doesn't exist
    if (!customerId) {
      const { data: user } = await supabaseClient.auth.admin.getUserById(userId)

      const customer = await stripe.customers.create({
        email: user.user?.email,
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})

// Helper to create Supabase client
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
    auth: {
      admin: {
        getUserById: async (id: string) => {
          const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          })
          const user = await response.json()
          return { data: { user } }
        },
      },
    },
  }
}

