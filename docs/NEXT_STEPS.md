# FeedVine — Next Steps Checklist

All four development phases are code-complete. This document tracks the remaining configuration, deployment, and testing work needed before launch.

---

## 1. Stripe — Backend Secrets (Individual Plans)

Stripe products for the 3 individual paid plans (Starter, Creator, Builder) have been created in sandbox mode. Price IDs are in the frontend `.env`. The backend edge functions read secrets at runtime, so these must be set in **Supabase Dashboard → Edge Functions → Secrets**:

| Secret | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Created in step 2 below (`whsec_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Starter monthly price ID |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Starter annual price ID |
| `STRIPE_PLUS_MONTHLY_PRICE_ID` | Creator monthly price ID |
| `STRIPE_PLUS_ANNUAL_PRICE_ID` | Creator annual price ID |
| `STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Builder monthly price ID |
| `STRIPE_PREMIUM_ANNUAL_PRICE_ID` | Builder annual price ID |

> Internal plan IDs (`pro`/`plus`/`premium`) map to display names (Starter/Creator/Builder). The env var names use the internal IDs.

- [ ] All 9 secrets set in Supabase Edge Functions

---

## 2. Stripe — Webhook Endpoint

Create a webhook in **Stripe Dashboard → Developers → Webhooks**:

- **URL:** `https://jrjotduzvzbslnbhswxo.supabase.co/functions/v1/stripe-webhook`
- **Events to subscribe:**
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the signing secret (`whsec_…`) → set as `STRIPE_WEBHOOK_SECRET` in Supabase secrets

- [ ] Webhook endpoint created in Stripe
- [ ] Signing secret saved to Supabase secrets

---

## 3. Stripe — Customer Portal

Activate the portal in **Stripe Dashboard → Settings → Billing → Customer portal**:

- Allow customers to update payment methods
- Allow customers to cancel subscriptions (end of period)
- Allow plan switching (if you want in-portal upgrades)

- [ ] Customer Portal activated

---

## 4. Stripe — Team Plan Products (Deferred OK)

Team plan products have **not** been created in Stripe yet. Individual plans work without them, but team checkout will fail until these are added:

| Product | Monthly | Annual | Seats | Secrets Needed |
|---|---|---|---|---|
| Team Starter | $99/mo | $79/mo ($948/yr) | 5 | `STRIPE_TEAM_MONTHLY_PRICE_ID`, `STRIPE_TEAM_ANNUAL_PRICE_ID` |
| Team Pro | $199/mo | $159/mo ($1,908/yr) | 15 | `STRIPE_TEAM_PRO_MONTHLY_PRICE_ID`, `STRIPE_TEAM_PRO_ANNUAL_PRICE_ID` |
| Team Business | $349/mo | $279/mo ($3,348/yr) | 30 | `STRIPE_TEAM_BUSINESS_MONTHLY_PRICE_ID`, `STRIPE_TEAM_BUSINESS_ANNUAL_PRICE_ID` |

Also add the frontend env vars to `.env`:

```
VITE_STRIPE_TEAM_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_TEAM_ANNUAL_PRICE_ID=price_...
VITE_STRIPE_TEAM_PRO_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_TEAM_PRO_ANNUAL_PRICE_ID=price_...
VITE_STRIPE_TEAM_BUSINESS_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_TEAM_BUSINESS_ANNUAL_PRICE_ID=price_...
```

- [ ] 3 team products created in Stripe (6 prices)
- [ ] 6 price IDs added to `.env`
- [ ] 6 price IDs added to Supabase Edge Function secrets

---

## 5. Third-Party API Keys

These edge functions require API keys that must be set in Supabase secrets:

| Secret | Used By | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `summarize-article`, `categorize-article`, `fetch-rss` | AI summaries + auto-categorization |
| `SLACK_CLIENT_ID` | `slack-oauth` | Slack app OAuth |
| `SLACK_CLIENT_SECRET` | `slack-oauth` | Slack app OAuth |
| `SLACK_SIGNING_SECRET` | `slack-commands` | Verifying Slack request signatures |
| `DISCORD_CLIENT_ID` | `discord-oauth` | Discord app OAuth |
| `DISCORD_CLIENT_SECRET` | `discord-oauth` | Discord app OAuth |
| `DISCORD_BOT_TOKEN` | `discord-oauth`, `discord-deliver` | Bot actions in Discord servers |

**Prerequisites:**
- Anthropic API account → get API key
- Slack App created at [api.slack.com/apps](https://api.slack.com/apps) with slash commands + OAuth scopes
- Discord App created at [discord.com/developers](https://discord.com/developers/applications) with bot permissions

- [ ] `ANTHROPIC_API_KEY` set in Supabase secrets
- [ ] Slack App created and 3 secrets set (defer if not launching teams immediately)
- [ ] Discord App created and 3 secrets set (defer if not launching teams immediately)

---

## 6. Deploy Edge Functions

The following functions need to be deployed (or redeployed for the `manage-team` seat-limit fix):

```bash
# Stripe
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy create-portal-session
supabase functions deploy upgrade-subscription

# Team (includes seat-limit enforcement fix)
supabase functions deploy manage-team

# Analytics & notifications (Phase D additions)
supabase functions deploy analytics-stats
supabase functions deploy send-scheduled-digest
```

Verify all functions are live:

```bash
supabase functions list
```

- [ ] All edge functions deployed
- [ ] `manage-team` redeployed with seat-limit fix

---

## 7. Test — Payment Flow

Use Stripe test cards:
- **Success:** `4242 4242 4242 4242` (any future expiry, any CVC)
- **Decline:** `4000 0000 0000 0002`
- **Requires auth:** `4000 0025 0000 3155`

| Test | What to Verify |
|---|---|
| New signup → checkout | Stripe Checkout opens, subscription created in `subscriptions` table |
| 30-day trial | `status` = `trialing`, `current_period_end` set 30 days out |
| Plan upgrade | `upgrade-subscription` function updates Stripe + webhook syncs DB |
| Billing portal | `create-portal-session` returns portal URL, user can manage billing |
| Cancel subscription | Webhook fires `subscription.deleted`, plan reverts to `free` |
| Failed payment | Webhook fires `invoice.payment_failed`, status becomes `past_due` |
| Declined card | Checkout rejects, no subscription created |

- [ ] Checkout → subscription created
- [ ] Plan upgrade works
- [ ] Billing portal accessible
- [ ] Cancellation downgrades to free
- [ ] Failed payment sets `past_due`

---

## 8. Test — Recently Built Features

These features are code-complete but need end-to-end verification:

### Phase C (Growth & B2B)
- [ ] **Team workspaces** — create team, invite member, accept invite, remove member
- [ ] **Seat limits** — invite blocked at plan cap (5/15/30), accept blocked at cap
- [ ] **Shared team collections** — create, add feeds, visible to team members
- [ ] **Slack bot** — OAuth flow, `/feedvine` commands, article delivery to channels
- [ ] **Discord bot** — OAuth flow, `/feedvine` commands, article delivery to channels
- [ ] **Digest history** — export a digest, verify it appears in history list

### Phase D (Retention & Polish)
- [ ] **PWA** — install from browser, app shell loads offline
- [ ] **Onboarding wizard** — new user sees 4-step flow, completion tracked in `user_metadata`
- [ ] **Usage analytics** — reading stats, streak, top feeds, feed health populate correctly
- [ ] **Notification preferences** — quiet hours saved, digest delivery skipped during quiet hours
- [ ] **Expanded digest schedules** — hourly, twice-daily, daily, etc. all fire correctly

---

## 9. Pre-Launch Polish

- [ ] **Landing page hero image** — add screenshot to `/public/feed-vine-hero.png`
- [ ] **Terms of Service** — review content in `src/pages/TermsPage.tsx`
- [ ] **Privacy Policy** — review content in `src/pages/PrivacyPage.tsx`
- [ ] **Domain setup** — configure `feedvine.app` (DNS, SSL, hosting)
- [ ] **CronNarc monitoring** — verify `fetch-rss` cron job is pinging correctly
- [ ] **Update `STRIPE_SETUP.md`** — plan names are outdated (Pro/Plus/Premium → Starter/Creator/Builder)
- [ ] **Update `.env.template`** — add Team plan price ID placeholders

---

## 10. Go-Live Checklist

- [ ] Switch Stripe to **live mode** — new API keys, new products/prices, new webhook
- [ ] Update all env vars with live keys (frontend `.env` + Supabase secrets)
- [ ] Final smoke test with a real $5 payment (Starter monthly)
- [ ] Verify webhook events flow through in production
- [ ] Enable Stripe Customer Portal in live mode
- [ ] Set up Stripe email receipts / notifications
- [ ] DNS pointing to production deployment
- [ ] Remove any test/seed data from production database
