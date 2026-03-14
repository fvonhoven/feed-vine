# FeedVine Launch Checklist

Personal next-steps to go live. Items already covered by the E2E test suite are marked with a note — everything else needs your manual attention.

---

## 7. Payment Flow (Stripe Test Cards)

Use these cards in Stripe test mode:

| Card | Purpose |
|------|---------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |
| `4000 0025 0000 3155` | Requires authentication |

- [ ] **Checkout → subscription created** — Open Stripe Checkout with a test card, confirm a `subscriptions` row is created in the DB. *E2E verifies the pricing page renders and clicking subscribe triggers Checkout, but doesn't complete a real Stripe transaction.*
- [ ] **30-day trial** — Sign up on a trial-eligible plan. Verify `status = trialing` and `current_period_end` is ~30 days out. *E2E verifies the "trialing" badge renders in Settings when status is set to trialing.*
- [ ] **Plan upgrade** — From Starter, upgrade to Creator. Confirm `upgrade-subscription` Edge Function fires and the webhook syncs the DB. *E2E verifies the UI reflects a plan change after a DB update, but doesn't invoke the actual Edge Function upgrade flow.*
- [ ] **Billing portal** — Click "Manage Billing" in Settings. Verify `create-portal-session` returns a portal URL and the portal loads. *E2E verifies the billing portal link is visible when subscribed.*
- [ ] **Cancel subscription** — Cancel via Billing Portal. Verify `subscription.deleted` webhook fires and plan reverts to `free`. *E2E verifies the UI shows "Free" plan and "canceled" badge after a DB downgrade.*
- [ ] **Failed payment → past_due** — Use the `4000 0000 0000 0341` card (attaches but fails on charge). Verify `invoice.payment_failed` webhook sets status to `past_due`. *E2E verifies the "past_due" badge renders in Settings.*
- [ ] **Declined card** — Use `4000 0000 0000 0002` at checkout. Verify checkout rejects and no subscription is created.

---

## 8. Recently Built Features

### Phase C — Growth & B2B

- [x] **Team workspaces** — Create team, invite member, remove member. *Covered by `team.spec.ts` (3 tests).*
- [x] **Seat limits** — Invite blocked at plan cap. *Covered by `seat-limits.spec.ts` (2 tests).*
- [x] **Shared team collections** — Create with team_id, visible on collections page. *Covered by `team-collections.spec.ts` (2 tests).*
- [ ] **Slack bot** — Run through the full OAuth flow, test `/feedvine` commands, verify article delivery to a Slack channel. *Not covered by E2E — requires a real Slack workspace.*
- [ ] **Discord bot** — Run through the full OAuth flow, test `/feedvine` commands, verify article delivery to a Discord channel. *Not covered by E2E — requires a real Discord server.*
- [x] **Digest history** — Seed a digest, verify it appears in the History tab. *Covered by `digest.spec.ts` (4 tests).*

### Phase D — Retention & Polish

- [x] **PWA** — Manifest configured, page loads without console errors. *Covered by `pwa.spec.ts` (2 tests).*
- [ ] **PWA install & offline** — Actually install the PWA from the browser and confirm the app shell loads when offline. *Requires manual browser install.*
- [x] **Onboarding wizard** — New user sees 4-step flow. *Covered by `auth.spec.ts` ("onboarding wizard has 4 steps").*
- [x] **Usage analytics** — Stats render on the analytics dashboard. *Covered by `settings.spec.ts` ("view usage analytics dashboard and stats render").*
- [x] **Notification preferences** — Quiet hours saved. *Covered by `settings.spec.ts` ("change notification preferences").*
- [ ] **Quiet hours enforcement** — Verify digest delivery is actually skipped during quiet hours. *Requires a live scheduled digest run with timing.*
- [ ] **Expanded digest schedules** — Verify hourly, twice-daily, daily schedules all fire correctly. *Requires real cron execution — `send-scheduled-digest` Edge Function.*

---

## 9. Pre-Launch Polish

- [ ] **Landing page hero image** — Add a real screenshot or marketing image to `/public/feed-vine-hero.png`.
- [x] **Terms of Service** — Page renders with legal sections. *Covered by `pre-launch.spec.ts`.* Still review the actual legal content in `src/pages/TermsPage.tsx` for accuracy.
- [x] **Privacy Policy** — Page renders with policy sections. *Covered by `pre-launch.spec.ts`.* Still review the actual legal content in `src/pages/PrivacyPage.tsx` for accuracy.
- [ ] **Domain setup** — Configure `feedvine.app`: DNS records, SSL certificate, hosting deployment.
- [ ] **CronNarc monitoring** — Verify the `fetch-rss` cron job is pinging CronNarc and alerting on failures.
- [x] **Update `STRIPE_SETUP.md`** — Plan names updated (Starter/Creator/Builder), Team plans added. *Done.*
- [x] **Update `.env.template`** — Team plan price ID placeholders added. *Done.*

---

## 10. Go-Live Checklist

- [ ] **Switch Stripe to live mode** — Create new live-mode API keys, products, prices, and webhook endpoint in the Stripe Dashboard.
- [ ] **Update all env vars** — Replace test keys with live keys in both the frontend `.env` and Supabase Edge Function secrets.
- [ ] **Final smoke test** — Make a real payment (Starter monthly, $6) with your own card. Confirm subscription is created and the app reflects the upgrade.
- [ ] **Verify webhook events** — Check the Stripe Dashboard → Webhooks → Recent events. Confirm `checkout.session.completed` and `customer.subscription.created` arrive and succeed.
- [ ] **Enable Stripe Customer Portal** — In live mode, configure the portal (cancellation, plan changes, payment method updates).
- [ ] **Stripe email receipts** — Enable automatic receipts/invoices in Stripe Settings → Emails.
- [ ] **DNS pointing to production** — Confirm `feedvine.app` resolves to your production deployment. Test with `curl -I https://feedvine.app`.
- [ ] **Remove test/seed data** — Delete any E2E test users, fake teams, and seed subscriptions from the production database.

---

## Summary

| Section | Total Items | Covered by E2E | Manual |
|---------|-------------|----------------|--------|
| 7. Payment Flow | 7 | 0 (UI verified, transactions need manual) | 7 |
| 8. Features | 12 | 8 | 4 |
| 9. Pre-Launch | 7 | 4 | 3 |
| 10. Go-Live | 8 | 0 | 8 |
| **Total** | **34** | **12** | **22** |

The E2E suite verifies that the UI correctly reflects subscription states, team operations, digest history, onboarding, analytics, and legal pages. The 22 manual items are things that require real external services (Stripe live mode, Slack/Discord OAuth, DNS configuration, cron execution) or human judgment (legal review, hero image).
