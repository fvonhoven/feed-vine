# FeedVine Implementation Plan
## Positioning: Content Operations Tool for Creators & Developers

---

## Pricing Strategy

### Revised Tiers (internal keys unchanged, display names updated)

| Tier | Internal Key | Monthly | Annual | Annual Total |
|------|-------------|---------|--------|-------------|
| Free | FREE | $0 | $0 | $0 |
| Starter | PRO | $6/mo | $5/mo | $60/yr |
| Creator ⭐ | PLUS | $14/mo | $11/mo | $132/yr |
| Builder | PREMIUM | $24/mo | $19/mo | $228/yr |

### 30-Day Free Trial (Annual Plans Only)

- User clicks "Start Free Trial" → enters card → gets full features for 30 days
- Day 30: Stripe auto-charges annual rate ($60 / $132 / $228)
- Cancel anytime during trial → $0 charged
- Monthly plans: no trial, subscribe immediately
- Implementation: `subscription_data[trial_period_days]=30` in Stripe checkout

### Trial Messaging
- Annual CTA: **"Start Free Trial"** — "30 days free, then $X/year ($Y/mo)"
- Monthly CTA: **"Subscribe Monthly"** — no trial
- Prominent annual, secondary monthly option in smaller text

---

## Tier Feature Matrix

| Feature | Free | Starter | Creator | Builder |
|---------|------|---------|---------|---------|
| Max feeds | 5 | 25 | 100 | ∞ |
| Max categories | 2 | 10 | 25 | ∞ |
| Max collections | 0 | 1 | 5 | ∞ |
| Read tracking | ✅ | ✅ | ✅ | ✅ |
| Saved articles | ❌ | ✅ | ✅ | ✅ |
| Article search | ❌ | ✅ | ✅ | ✅ |
| Keyboard shortcuts | ❌ | ✅ | ✅ | ✅ |
| OPML export | ❌ | ✅ | ✅ | ✅ |
| Full-text fetch | ❌ | ❌ | ✅ | ✅ |
| Webhooks (Zapier/Make) | ❌ | ❌ | ✅ (5) | ✅ (∞) |
| Newsletter export | ❌ | ❌ | ✅ | ✅ |
| AI summaries | ❌ | ❌ | ✅ (200/mo) | ✅ (∞) |
| Scheduled auto-draft | ❌ | ❌ | ✅ | ✅ |
| Keyword filters | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |
| Priority support | ❌ | ❌ | ❌ | ✅ |

---

## Sprint 1: Core Value Features (Weeks 1–3)

### 1. AI Article Summaries ← START HERE

**Why first:** The feature that makes Creator tier worth paying $14/mo.

**User flow:** Click "Summarize" button on any article → spinner → AI summary appears below title

**Implementation:**
- `supabase/migrations/020_add_ai_summary.sql` — Add `ai_summary TEXT`, `ai_summary_generated_at TIMESTAMPTZ` to articles; create `ai_summary_usage(user_id, month, count)` table
- `supabase/functions/summarize-article/index.ts` — Edge function: verify auth + plan (Creator+), check monthly usage limit (200 for Creator, ∞ for Builder), call Claude 3.5 Haiku, store result, increment usage
- `src/components/ArticleCard.tsx` — Add Summarize button (hidden for Free/Starter), show summary when available, loading/error states
- `src/lib/stripe.ts` — Add `aiSummaries: boolean` and `maxAiSummaries: number` to feature flags

**Cost:** ~$0.0018 per summary (Claude Haiku). Creator user at 200/mo cap = $0.36/mo cost vs $11-14 revenue.

**Model:** Claude 3.5 Haiku (`claude-3-5-haiku-20241022`) — already configured via `ANTHROPIC_API_KEY`

### 2. Pricing Tier Restructure

**Files to update:**
- `src/lib/stripe.ts` — Rename display names, update prices, limits, add new feature flags
- `src/hooks/useSubscription.ts` — Extend `hasFeature` / `getLimit` types
- `src/pages/PricingPage.tsx` — Trial messaging, "Start Free Trial" CTA
- `supabase/functions/create-checkout-session/index.ts` — Add `trial_period_days: 30`
- `src/types/database.ts` — No DB changes needed (keep plan_id values: free/pro/plus/premium)

### 3. Stripe Checkout: 30-Day Trial

Add to `createStripeCheckoutSession()`:
```
"subscription_data[trial_period_days]": "30"
```

---

## Sprint 2: Retention Features (Weeks 4–6)

### 4. Keyword Filter Rules (Creator+)

Users can include/exclude articles based on keywords per feed.

**Migration:** `021_feed_filters.sql`
```sql
CREATE TABLE feed_filters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,  -- NULL = applies to all feeds
  filter_type TEXT NOT NULL CHECK (filter_type IN ('include', 'exclude')),
  keywords TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**UI:** Add "Filters" section in FeedManager per feed. Include/exclude keyword chips.
**Gate:** Creator+ only

### 5. Scheduled Auto-Draft to Beehiiv/MailerLite (Creator+)

Auto-create draft in newsletter platform on a schedule. Zero extra cost — reuses existing edge functions.

**Migration:** `022_scheduled_digests.sql`
```sql
CREATE TABLE scheduled_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,  -- 'weekly_monday', 'weekly_friday', 'daily'
  collection_id UUID REFERENCES feed_collections(id),
  platform TEXT NOT NULL CHECK (platform IN ('beehiiv', 'mailerlite')),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Edge function:** `send-scheduled-digest/index.ts` — Triggered by pg_cron, queries due schedules, assembles HTML digest, calls send-to-beehiiv or send-to-mailerlite
**UI:** Add "Schedule" tab to DigestPage
**Gate:** Creator+ only

---

## Sprint 3: Growth & B2B (Weeks 7–12)

### 6. Team Workspaces (Path to $10k MRR)

Shared feeds, collections, and digest workflows with invite system.

**Pricing:** Team plan at $99/mo for 5 seats ($49/mo annual)

**Migration:** `023_teams.sql` — `teams`, `team_members`, `team_invites` tables

**Features:**
- Create/invite team members
- Shared feed collections visible to all team members
- Team billing (one subscription covers all seats)
- Admin dashboard showing team activity

### 7. Reading Time Estimate (All Plans)

Add `~X min read` to ArticleCard. Calculated from article word count.

**Implementation:** Pure frontend — calculate in `ArticleCard.tsx`:
```typescript
const wordCount = stripHtml(article.content || article.description).split(/\s+/).length
const readingTime = Math.ceil(wordCount / 200)  // ~200 words/minute
```

---

## Distribution Plan (Parallel Track)

| Channel | Action | Timeline |
|---------|--------|---------|
| Beehiiv Integration Directory | Submit FeedVine as integration | Week 2 |
| MailerLite App Marketplace | Submit integration listing | Week 2 |
| Product Hunt | Launch with AI summaries feature | Week 4 |
| Zapier App Directory | Submit native Zapier app | Week 6 |
| SEO | "RSS reader for newsletters" content | Ongoing |
| Twitter/LinkedIn | Creator audience building | Ongoing |

---

## Path to $10k MRR

| Month | Registered Users | Paid Users | Team Accounts | MRR |
|-------|-----------------|-----------|---------------|-----|
| 3 | 1,500 | 60 | 2 | ~$820 |
| 6 | 3,000 | 150 | 10 | ~$2,700 |
| 9 | 5,000 | 280 | 25 | ~$5,640 |
| 12 | 8,000 | 400 | 40 | ~$8,800 |
| 15 | 10,000 | 500 | 50 | ~$11,250 |

**Biggest single lever:** Getting listed in Beehiiv + MailerLite integration directories.
FeedVine is the ONLY RSS reader with native export to both platforms.

