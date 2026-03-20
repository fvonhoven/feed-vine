import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""

/**
 * Extract period timestamps from a Stripe subscription object.
 *
 * Stripe API 2025-12-15+ moved current_period_start/end to the item level.
 * Fallback chain: top-level → items.data[0] → trial_start/trial_end.
 */
function extractPeriodDates(sub: unknown): { periodStart: string | null; periodEnd: string | null } {
  const s = sub as Record<string, unknown>
  const items = s.items as Record<string, unknown> | undefined
  const firstItem = (items?.data as Record<string, unknown>[] | undefined)?.[0]

  const toIso = (val: unknown): string | null => {
    if (typeof val === "number" && val > 0) return new Date(val * 1000).toISOString()
    if (typeof val === "string" && val.length > 0) {
      const num = Number(val)
      if (!isNaN(num) && num > 0) return new Date(num * 1000).toISOString()
    }
    return null
  }

  const periodStart =
    toIso(s.current_period_start) ??
    toIso(firstItem?.current_period_start) ??
    toIso(s.trial_start)

  const periodEnd =
    toIso(s.current_period_end) ??
    toIso(firstItem?.current_period_end) ??
    toIso(s.trial_end)

  return { periodStart, periodEnd }
}

/**
 * Determine whether the subscription is scheduled to cancel.
 * Stripe uses cancel_at_period_end (bool) OR cancel_at (timestamp).
 */
function isCancelling(sub: unknown): boolean {
  const s = sub as Record<string, unknown>
  if (s.cancel_at_period_end === true) return true
  if (typeof s.cancel_at === "number" && s.cancel_at > 0) return true
  return false
}

// Helper function to map Stripe status to our database status
function mapStripeStatusToDb(stripeStatus: string): string {
  // Stripe statuses: active, past_due, unpaid, canceled, incomplete, incomplete_expired, trialing, paused
  // Our DB statuses: active, canceled, past_due, trialing
  if (stripeStatus === "canceled" || stripeStatus === "incomplete_expired") {
    return "canceled"
  } else if (stripeStatus === "past_due" || stripeStatus === "unpaid") {
    return "past_due"
  } else if (stripeStatus === "trialing") {
    return "trialing"
  } else {
    return "active" // For: active, incomplete, paused
  }
}

serve(async req => {
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return new Response("No signature", { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, supabaseUrl, supabaseKey)
        break
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription, supabaseUrl, supabaseKey)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription, supabaseUrl, supabaseKey)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, supabaseUrl, supabaseKey)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice, supabaseUrl, supabaseKey)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice, supabaseUrl, supabaseKey)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Webhook error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabaseUrl: string, supabaseKey: string) {
  console.log(
    "Checkout session received:",
    JSON.stringify({
      id: session.id,
      customer: session.customer,
      subscription: session.subscription,
      metadata: session.metadata,
    }),
  )

  const userId = session.metadata?.user_id
  const subscriptionId = session.subscription as string

  if (!userId || !subscriptionId) {
    console.error("Missing userId or subscriptionId in checkout session")
    return
  }


  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Determine plan ID from price
  const priceId = subscription.items.data[0]?.price.id

  let planId = "free"

  // Map price IDs to plan IDs (checking both monthly and annual)
  const proPrices = [Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")].filter(Boolean)

  const plusPrices = [Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")].filter(Boolean)

  const premiumPrices = [Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")].filter(Boolean)

  const teamPrices = [Deno.env.get("STRIPE_TEAM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_ANNUAL_PRICE_ID")].filter(Boolean)
  const teamProPrices = [Deno.env.get("STRIPE_TEAM_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_PRO_ANNUAL_PRICE_ID")].filter(Boolean)
  const teamBusinessPrices = [Deno.env.get("STRIPE_TEAM_BUSINESS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_BUSINESS_ANNUAL_PRICE_ID")].filter(
    Boolean,
  )

  if (proPrices.includes(priceId)) {
    planId = "pro"
  } else if (plusPrices.includes(priceId)) {
    planId = "plus"
  } else if (premiumPrices.includes(priceId)) {
    planId = "premium"
  } else if (teamPrices.includes(priceId)) {
    planId = "team"
  } else if (teamProPrices.includes(priceId)) {
    planId = "team_pro"
  } else if (teamBusinessPrices.includes(priceId)) {
    planId = "team_business"
  }


  const dbStatus = mapStripeStatusToDb(subscription.status)

  const { periodStart, periodEnd } = extractPeriodDates(subscription)

  const checkoutPayload: Record<string, unknown> = {
    stripe_customer_id: session.customer,
    stripe_subscription_id: subscriptionId,
    plan_id: planId,
    status: dbStatus,
    cancel_at_period_end: isCancelling(subscription),
  }
  if (periodStart) checkoutPayload.current_period_start = periodStart
  if (periodEnd) checkoutPayload.current_period_end = periodEnd


  const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(checkoutPayload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Failed to update subscription in database:", errorText)
  } else {
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription, supabaseUrl: string, supabaseKey: string) {
  const customerId = subscription.customer as string

  // Get user ID from customer
  const customer = await stripe.customers.retrieve(customerId)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!userId) {
    console.error("No user ID found in customer metadata for subscription.created")
    return
  }


  // Determine plan ID from price
  const priceId = subscription.items.data[0]?.price.id

  let planId = "free"

  // Map price IDs to plan IDs (checking both monthly and annual)
  const proPrices = [Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")].filter(Boolean)
  const plusPrices = [Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")].filter(Boolean)
  const premiumPrices = [Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")].filter(Boolean)
  const teamPrices = [Deno.env.get("STRIPE_TEAM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_ANNUAL_PRICE_ID")].filter(Boolean)
  const teamProPrices = [Deno.env.get("STRIPE_TEAM_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_PRO_ANNUAL_PRICE_ID")].filter(Boolean)
  const teamBusinessPrices = [Deno.env.get("STRIPE_TEAM_BUSINESS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_BUSINESS_ANNUAL_PRICE_ID")].filter(
    Boolean,
  )

  if (proPrices.includes(priceId)) {
    planId = "pro"
  } else if (plusPrices.includes(priceId)) {
    planId = "plus"
  } else if (premiumPrices.includes(priceId)) {
    planId = "premium"
  } else if (teamPrices.includes(priceId)) {
    planId = "team"
  } else if (teamProPrices.includes(priceId)) {
    planId = "team_pro"
  } else if (teamBusinessPrices.includes(priceId)) {
    planId = "team_business"
  }


  const dbStatus = mapStripeStatusToDb(subscription.status)

  const { periodStart, periodEnd } = extractPeriodDates(subscription)

  const payload: Record<string, unknown> = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan_id: planId,
    status: dbStatus,
    cancel_at_period_end: isCancelling(subscription),
  }
  if (periodStart) payload.current_period_start = periodStart
  if (periodEnd) payload.current_period_end = periodEnd


  // Update subscription in database using PATCH to update existing record
  const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })


  if (!response.ok) {
    const errorText = await response.text()
    console.error("Failed to create subscription in database:", errorText)
  } else {
    const responseData = await response.text()
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabaseUrl: string, supabaseKey: string) {
  const customerId = subscription.customer as string

  const customer = await stripe.customers.retrieve(customerId)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!userId) return


  const priceId = subscription.items.data[0]?.price.id
  let planId = "free"

  const proPrices = [Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")].filter(Boolean)
  const plusPrices = [Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")].filter(Boolean)
  const premiumPrices = [Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")].filter(Boolean)
  const teamPrices = [Deno.env.get("STRIPE_TEAM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_ANNUAL_PRICE_ID")].filter(Boolean)
  const teamProPrices = [Deno.env.get("STRIPE_TEAM_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_PRO_ANNUAL_PRICE_ID")].filter(Boolean)
  const teamBusinessPrices = [Deno.env.get("STRIPE_TEAM_BUSINESS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_TEAM_BUSINESS_ANNUAL_PRICE_ID")].filter(
    Boolean,
  )

  if (proPrices.includes(priceId)) {
    planId = "pro"
  } else if (plusPrices.includes(priceId)) {
    planId = "plus"
  } else if (premiumPrices.includes(priceId)) {
    planId = "premium"
  } else if (teamPrices.includes(priceId)) {
    planId = "team"
  } else if (teamProPrices.includes(priceId)) {
    planId = "team_pro"
  } else if (teamBusinessPrices.includes(priceId)) {
    planId = "team_business"
  }

  const dbStatus = mapStripeStatusToDb(subscription.status)

  const { periodStart, periodEnd } = extractPeriodDates(subscription)

  const payload: Record<string, unknown> = {
    plan_id: planId,
    status: dbStatus,
    cancel_at_period_end: isCancelling(subscription),
  }

  if (periodStart) payload.current_period_start = periodStart
  if (periodEnd) payload.current_period_end = periodEnd


  const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("subscription.updated PATCH failed:", errorText)
  } else {
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabaseUrl: string, supabaseKey: string) {
  const customerId = subscription.customer as string
  const customer = await stripe.customers.retrieve(customerId)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!userId) return

  // Downgrade to free plan
  await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: "free",
      status: "canceled",
      stripe_subscription_id: null,
    }),
  })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, supabaseUrl: string, supabaseKey: string) {
  const customerId = invoice.customer as string
  const customer = await stripe.customers.retrieve(customerId)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!userId) return


  const subscriptionId = invoice.subscription as string | null
  if (!subscriptionId) {
    return
  }

  // Retrieve the actual subscription to get the authoritative status —
  // a $0 trial invoice fires payment_succeeded even while trialing
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const dbStatus = mapStripeStatusToDb(subscription.status)

  const { periodStart, periodEnd } = extractPeriodDates(subscription)

  const paymentPayload: Record<string, unknown> = { status: dbStatus }
  if (periodStart) paymentPayload.current_period_start = periodStart
  if (periodEnd) paymentPayload.current_period_end = periodEnd


  await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paymentPayload),
  })
}

async function handlePaymentFailed(invoice: Stripe.Invoice, supabaseUrl: string, supabaseKey: string) {
  const customerId = invoice.customer as string
  const customer = await stripe.customers.retrieve(customerId)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!userId) return

  // Update status to past_due
  await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "past_due",
    }),
  })
}
