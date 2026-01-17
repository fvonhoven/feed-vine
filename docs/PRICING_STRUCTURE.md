# 💰 FeedVine Pricing Structure

## Overview

FeedVine offers 4 pricing tiers with both **monthly** and **annual** billing options. Annual billing provides significant savings (17-21% off).

## Pricing Tiers

### 🆓 Free Plan

**Price:** $0/month

**Features:**

- 1 RSS feed
- 1 category
- Read/unread tracking
- Basic filters

**Perfect for:** Trying out the service, casual users

---

### ⭐ Pro Plan

**Monthly:** $6/month
**Annual:** $5/month ($60/year) - **Save 17%**

**Everything in Free, plus:**

- 5 RSS feeds & 3 categories
- Save articles
- 1 feed collection
- Export to RSS

**Perfect for:** Individual power users, content curators

---

### 🔥 Plus Plan (MOST POPULAR)

**Monthly:** $12/month
**Annual:** $10/month ($120/year) - **Save 17%**

**Everything in Pro, plus:**

- 15 RSS feeds & 10 categories
- 5 feed collections
- Advanced filters
- Keyboard shortcuts

**Perfect for:** Heavy users, professional content managers

---

### 💎 Premium Plan

**Monthly:** $19/month
**Annual:** $15/month ($180/year) - **Save 21%**

**Everything in Plus, plus:**

- 25 RSS feeds & 25 categories
- 25 feed collections
- **🔑 API Access (2,000 requests/hour)**

**Perfect for:** Developers and power users who need API access

---

## Annual Savings Breakdown

| Plan    | Monthly Cost | Annual Cost | Annual Savings | % Saved |
| ------- | ------------ | ----------- | -------------- | ------- |
| Pro     | $72/year     | $60/year    | $12/year       | 17%     |
| Plus    | $144/year    | $120/year   | $24/year       | 17%     |
| Premium | $228/year    | $180/year   | $48/year       | 21%     |

## Stripe Product Setup

When setting up Stripe products, you'll need to create **6 price IDs total** (2 per paid plan):

### Pro Plan

- Monthly Price ID: `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`
- Annual Price ID: `VITE_STRIPE_PRO_ANNUAL_PRICE_ID`

### Plus Plan

- Monthly Price ID: `VITE_STRIPE_PLUS_MONTHLY_PRICE_ID`
- Annual Price ID: `VITE_STRIPE_PLUS_ANNUAL_PRICE_ID`

### Premium Plan

- Monthly Price ID: `VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID`
- Annual Price ID: `VITE_STRIPE_PREMIUM_ANNUAL_PRICE_ID`

## Implementation Notes

1. **Default Billing:** The pricing page defaults to showing annual pricing (better conversion)
2. **Toggle:** Users can switch between monthly and annual billing with a toggle
3. **Savings Badge:** Annual option shows "Save up to 27%" badge
4. **Price Display:** Shows both the discounted annual price and crossed-out monthly price
5. **CTA Buttons:** Dynamically update based on selected billing interval

## Marketing Messaging

**Key Points:**

- "Save up to 21% with annual billing"
- "All plans include 14-day money-back guarantee"
- "Cancel anytime, no questions asked"
- "Start free, upgrade when you need more"

**Value Propositions:**

- **Free:** Perfect for getting started
- **Pro:** Best for individual users ($5/mo annual = less than a coffee!)
- **Plus:** Most popular - everything you need ($10/mo annual)
- **Premium:** For developers and power users who need API access ($15/mo annual)

## Conversion Strategy

1. **Anchor on Annual:** Show annual pricing by default (appears cheaper)
2. **Highlight Savings:** Make the discount percentage prominent
3. **Popular Badge:** Mark Plus plan as "MOST POPULAR"
4. **Social Proof:** Add testimonials near pricing
5. **Money-Back Guarantee:** Reduce purchase anxiety

## Future Considerations

- **Lifetime Deal:** Consider one-time payment option for early adopters
- **Team Plans:** Add team/workspace features for higher tiers
- **Enterprise:** Custom pricing for large organizations
- **Add-ons:** Extra feeds, categories, or collections as add-ons
- **Priority Support:** Add dedicated support channel for premium users
- **Higher API Limits:** Offer higher API rate limits as an add-on
