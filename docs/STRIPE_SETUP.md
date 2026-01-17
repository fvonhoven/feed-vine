# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe payments for your RSS Aggregator micro-SaaS.

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Supabase project with Edge Functions enabled
- Access to your Supabase project dashboard

## Step 1: Create Stripe Products and Prices

1. **Log in to Stripe Dashboard** (https://dashboard.stripe.com)

2. **Create Products:**

   - Go to **Products** → **Add Product**

   **Pro Plan:**

   - Name: "FeedVine Pro"
   - Description: "5 RSS feeds, 3 categories, save articles, 1 feed collection"
   - Create TWO prices:
     - Monthly: $6/month (recurring monthly) → Copy **Price ID**
     - Annual: $5/month ($60/year billed annually) → Copy **Price ID**

   **Plus Plan:**

   - Name: "FeedVine Plus"
   - Description: "15 RSS feeds, 10 categories, 5 feed collections, advanced filters"
   - Create TWO prices:
     - Monthly: $12/month (recurring monthly) → Copy **Price ID**
     - Annual: $10/month ($120/year billed annually) → Copy **Price ID**

   **Premium Plan:**

   - Name: "FeedVine Premium"
   - Description: "25 RSS feeds, 25 categories, 25 collections, advanced filters, keyboard shortcuts"
   - Create TWO prices:
     - Monthly: $19/month (recurring monthly) → Copy **Price ID**
     - Annual: $15/month ($180/year billed annually) → Copy **Price ID**

3. **Save your Price IDs** - you'll need 6 total price IDs (2 per plan)

**Note:** The Free plan doesn't need a Stripe product since it's free and doesn't require payment.

**Annual Savings:**

- Pro: Save 17% ($12/year)
- Plus: Save 17% ($24/year)
- Premium: Save 21% ($48/year)

## Step 2: Get Stripe API Keys

1. Go to **Developers** → **API keys**
2. Copy your **Publishable key** (starts with `pk_test_` for test mode)
3. Copy your **Secret key** (starts with `sk_test_` for test mode)
4. **Important:** Keep your secret key secure and never commit it to version control

## Step 3: Configure Environment Variables

### Frontend (.env)

Create or update `.env` in your project root:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Monthly Price IDs
VITE_STRIPE_PRO_MONTHLY_PRICE_ID=price_your_pro_monthly_price_id
VITE_STRIPE_PLUS_MONTHLY_PRICE_ID=price_your_plus_monthly_price_id
VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_your_premium_monthly_price_id

# Annual Price IDs
VITE_STRIPE_PRO_ANNUAL_PRICE_ID=price_your_pro_annual_price_id
VITE_STRIPE_PLUS_ANNUAL_PRICE_ID=price_your_plus_annual_price_id
VITE_STRIPE_PREMIUM_ANNUAL_PRICE_ID=price_your_premium_annual_price_id
```

### Backend (Supabase Edge Functions)

1. Go to **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Add the following secrets:

```
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Step 4: Deploy Supabase Edge Functions

1. **Install Supabase CLI** (if not already installed):

```bash
npm install -g supabase
```

2. **Login to Supabase:**

```bash
supabase login
```

3. **Link your project:**

```bash
supabase link --project-ref your-project-ref
```

4. **Deploy the checkout session function:**

```bash
supabase functions deploy create-checkout-session
```

5. **Deploy the webhook function:**

```bash
supabase functions deploy stripe-webhook
```

## Step 5: Set Up Stripe Webhook

1. **Get your webhook endpoint URL:**

   - Format: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`

2. **In Stripe Dashboard:**

   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Enter your webhook URL
   - Select events to listen to:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Click **Add endpoint**

3. **Get Webhook Signing Secret:**
   - Click on your newly created webhook
   - Copy the **Signing secret** (starts with `whsec_`)
   - Add it to Supabase Edge Functions secrets:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   ```

## Step 6: Run Database Migration

Run the subscription table migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL in Supabase Dashboard → SQL Editor
# Copy contents from supabase/migrations/003_subscriptions.sql
```

## Step 7: Test the Integration

### Test Mode

1. **Use Stripe test cards:**

   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date and any 3-digit CVC

2. **Test the flow:**

   - Sign in to your app
   - Go to Pricing page
   - Click "Go Pro", "Go Plus", or "Go Premium"
   - Complete checkout with test card
   - Verify subscription in Supabase `subscriptions` table
   - Check Stripe Dashboard for the subscription

3. **Test webhook:**
   - Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```

### Production Mode

1. **Switch to live mode in Stripe Dashboard**
2. **Get live API keys** (start with `pk_live_` and `sk_live_`)
3. **Create live products and prices**
4. **Update environment variables** with live keys
5. **Create new webhook** for production URL
6. **Test with real payment method** (small amount)

## Step 8: Customer Portal (Optional)

Enable Stripe Customer Portal for users to manage their subscriptions:

1. **In Stripe Dashboard:**

   - Go to **Settings** → **Billing** → **Customer portal**
   - Click **Activate test link** (or **Activate** for production)
   - Configure portal settings:
     - Allow customers to update payment methods
     - Allow customers to cancel subscriptions
     - Set cancellation behavior (immediate or end of period)

2. **Add portal link to your app:**
   - In Settings page, add a "Manage Billing" button
   - Use Stripe's `createPortalSession` API to generate portal URL

## Troubleshooting

### Checkout not working

- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set correctly
- Check browser console for errors
- Ensure Edge Function is deployed and accessible

### Webhook not receiving events

- Verify webhook URL is correct
- Check webhook signing secret matches
- Use Stripe CLI to test locally
- Check Supabase Edge Function logs

### Subscription not updating in database

- Check Edge Function logs in Supabase Dashboard
- Verify `STRIPE_SECRET_KEY` is set in Edge Functions secrets
- Ensure database migration ran successfully
- Check RLS policies on `subscriptions` table

## Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Use environment variables** for all sensitive data
3. **Validate webhook signatures** (already implemented)
4. **Use HTTPS** for all webhook endpoints
5. **Implement rate limiting** on checkout endpoints
6. **Log all payment events** for audit trail
7. **Test thoroughly** in test mode before going live

## Going Live Checklist

- [ ] Switch to live Stripe API keys
- [ ] Create live products and prices
- [ ] Update all environment variables
- [ ] Set up production webhook
- [ ] Test with real payment
- [ ] Enable Stripe Customer Portal
- [ ] Set up email notifications
- [ ] Configure tax settings (if applicable)
- [ ] Review Terms of Service and Privacy Policy
- [ ] Set up monitoring and alerts
- [ ] Test cancellation and refund flows

## Support

For issues with:

- **Stripe:** https://support.stripe.com
- **Supabase:** https://supabase.com/docs/guides/functions
- **This integration:** Check Edge Function logs in Supabase Dashboard
