import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { validateReturnUrl } from "../_shared/security.ts"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || ""

// Direct Stripe API calls to avoid SDK compatibility issues
async function createStripeCustomer(email: string, userId: string) {
  const response = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email,
      "metadata[supabase_user_id]": userId,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("Stripe customer creation error:", errorBody)
    throw new Error(`Stripe customer creation failed: ${response.status} - ${errorBody}`)
  }

  return await response.json()
}

type BillingInterval = "monthly" | "annual"

const PLAN_PRICE_ENV: Record<string, Record<BillingInterval, string>> = {
  pro: { monthly: "STRIPE_PRO_MONTHLY_PRICE_ID", annual: "STRIPE_PRO_ANNUAL_PRICE_ID" },
  plus: { monthly: "STRIPE_PLUS_MONTHLY_PRICE_ID", annual: "STRIPE_PLUS_ANNUAL_PRICE_ID" },
  premium: { monthly: "STRIPE_PREMIUM_MONTHLY_PRICE_ID", annual: "STRIPE_PREMIUM_ANNUAL_PRICE_ID" },
  team: { monthly: "STRIPE_TEAM_MONTHLY_PRICE_ID", annual: "STRIPE_TEAM_ANNUAL_PRICE_ID" },
  team_pro: { monthly: "STRIPE_TEAM_PRO_MONTHLY_PRICE_ID", annual: "STRIPE_TEAM_PRO_ANNUAL_PRICE_ID" },
  team_business: { monthly: "STRIPE_TEAM_BUSINESS_MONTHLY_PRICE_ID", annual: "STRIPE_TEAM_BUSINESS_ANNUAL_PRICE_ID" },
}

function resolvePriceId(planId: string, interval: BillingInterval): string {
  if (planId.startsWith("team") && Deno.env.get("TEAM_PLANS_ENABLED") !== "true") {
    throw new Error("Team plans are not available yet")
  }
  const envName = PLAN_PRICE_ENV[planId]?.[interval]
  const priceId = envName ? Deno.env.get(envName) : null
  if (!priceId) throw new Error("Invalid plan or billing interval")
  return priceId
}

async function createStripeCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  interval: BillingInterval,
  successUrl: string,
  cancelUrl: string,
) {
  const checkoutParams: Record<string, string> = {
    customer: customerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    "metadata[user_id]": userId,
  }
  if (interval === "annual") checkoutParams["subscription_data[trial_period_days]"] = "30"

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(checkoutParams),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("Stripe checkout session error:", errorBody)
    throw new Error(`Stripe checkout session creation failed: ${response.status} - ${errorBody}`)
  }

  return await response.json()
}

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

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
    })

    if (!userResponse.ok) {
      const errorBody = await userResponse.text()
      console.error("Auth API error:", errorBody)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const user = await userResponse.json()
    const userId = user.id
    const userEmail = user.email

    const { planId, interval } = await req.json()
    if (typeof planId !== "string" || (interval !== "monthly" && interval !== "annual")) {
      throw new Error("A valid plan and billing interval are required")
    }
    const priceId = resolvePriceId(planId, interval)

    // Get or create Stripe customer using custom lightweight client
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

    // Check if user already has a Stripe customer ID
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id,stripe_subscription_id,status")
      .eq("user_id", userId)
      .single()

    if (subscription?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(subscription.status)) {
      throw new Error("An existing subscription must be managed through the billing portal")
    }

    let customerId = subscription?.stripe_customer_id

    // Create new customer if doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer(userEmail, userId)
      customerId = customer.id

      // Save customer ID to database
      await supabaseClient.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        plan_id: "free",
        status: "active",
      })
    }

    const originHeader = req.headers.get("origin")
    const allowedOrigin = originHeader ? validateReturnUrl(originHeader) : null
    const baseUrl = allowedOrigin ?? Deno.env.get("FRONTEND_URL") ?? "https://feedvine.app"
    const session = await createStripeCheckoutSession(
      customerId,
      priceId,
      userId,
      interval,
      `${baseUrl.replace(/\/$/, "")}/settings?success=true`,
      `${baseUrl.replace(/\/$/, "")}/pricing?canceled=true`,
    )

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
