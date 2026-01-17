import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""

serve(async req => {
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return new Response("No signature", { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, supabaseUrl, supabaseKey)
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

  if (!userId || !subscriptionId) return

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Determine plan ID from price
  const priceId = subscription.items.data[0]?.price.id
  let planId = "free"

  if (priceId === Deno.env.get("VITE_STRIPE_PRO_PRICE_ID")) {
    planId = "pro"
  } else if (priceId === Deno.env.get("VITE_STRIPE_TEAM_PRICE_ID")) {
    planId = "team"
  }

  // Update subscription in database
  await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
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
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }),
  })
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

  if (priceId === Deno.env.get("VITE_STRIPE_PRO_PRICE_ID")) {
    planId = "pro"
  } else if (priceId === Deno.env.get("VITE_STRIPE_PLUS_PRICE_ID")) {
    planId = "plus"
  } else if (priceId === Deno.env.get("VITE_STRIPE_PREMIUM_PRICE_ID")) {
    planId = "premium"
  }

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
      status: subscription.status,
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
