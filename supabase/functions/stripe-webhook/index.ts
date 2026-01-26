import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""

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
  const userId = session.metadata?.user_id
  const subscriptionId = session.subscription as string

  if (!userId || !subscriptionId) {
    console.error("Missing userId or subscriptionId in checkout session")
    return
  }

  console.log("Processing checkout completion for user:", userId)

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Determine plan ID from price
  const priceId = subscription.items.data[0]?.price.id
  console.log("Price ID from subscription:", priceId)

  let planId = "free"

  // Map price IDs to plan IDs (checking both monthly and annual)
  const proPrices = [Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")].filter(Boolean)

  const plusPrices = [Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")].filter(Boolean)

  const premiumPrices = [Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")].filter(Boolean)

  if (proPrices.includes(priceId)) {
    planId = "pro"
  } else if (plusPrices.includes(priceId)) {
    planId = "plus"
  } else if (premiumPrices.includes(priceId)) {
    planId = "premium"
  }

  console.log("Mapped to plan:", planId)

  const dbStatus = mapStripeStatusToDb(subscription.status)
  console.log("Stripe status:", subscription.status, "-> DB status:", dbStatus)

  // Update subscription in database
  const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscriptionId,
      plan_id: planId,
      status: dbStatus,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Failed to update subscription in database:", errorText)
  } else {
    console.log("Successfully updated subscription for user:", userId, "to plan:", planId)
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

  console.log("Processing subscription.created for user:", userId)

  // Determine plan ID from price
  const priceId = subscription.items.data[0]?.price.id
  console.log("Price ID from subscription:", priceId)

  let planId = "free"

  // Map price IDs to plan IDs (checking both monthly and annual)
  const proPrices = [Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")].filter(Boolean)
  const plusPrices = [Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")].filter(Boolean)
  const premiumPrices = [Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")].filter(Boolean)

  if (proPrices.includes(priceId)) {
    planId = "pro"
  } else if (plusPrices.includes(priceId)) {
    planId = "plus"
  } else if (premiumPrices.includes(priceId)) {
    planId = "premium"
  }

  console.log("Mapped to plan:", planId)

  const dbStatus = mapStripeStatusToDb(subscription.status)
  console.log("Stripe status:", subscription.status, "-> DB status:", dbStatus)

  // Create or update subscription in database
  const response = await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status: dbStatus,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Failed to create subscription in database:", errorText)
  } else {
    console.log("Successfully created subscription for user:", userId, "to plan:", planId)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabaseUrl: string, supabaseKey: string) {
  const customerId = subscription.customer as string

  // Get user ID from customer
  const customer = await stripe.customers.retrieve(customerId)
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id

  if (!userId) return

  // Determine plan ID
  const priceId = subscription.items.data[0]?.price.id
  let planId = "free"

  // Map price IDs to plan IDs (checking both monthly and annual)
  const proPrices = [Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PRO_ANNUAL_PRICE_ID")].filter(Boolean)

  const plusPrices = [Deno.env.get("STRIPE_PLUS_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PLUS_ANNUAL_PRICE_ID")].filter(Boolean)

  const premiumPrices = [Deno.env.get("STRIPE_PREMIUM_MONTHLY_PRICE_ID"), Deno.env.get("STRIPE_PREMIUM_ANNUAL_PRICE_ID")].filter(Boolean)

  if (proPrices.includes(priceId)) {
    planId = "pro"
  } else if (plusPrices.includes(priceId)) {
    planId = "plus"
  } else if (premiumPrices.includes(priceId)) {
    planId = "premium"
  }

  const dbStatus = mapStripeStatusToDb(subscription.status)

  // Update subscription
  await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      status: dbStatus,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }),
  })
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

  console.log("Payment succeeded for user:", userId)

  // Update status to active (in case it was past_due)
  await fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "active",
    }),
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
