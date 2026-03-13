# FeedVine — Competitive Analysis & Next Steps Roadmap

## Competitive Landscape

| Feature                        | Feedly             | Inoreader          | Feedbin | Readwise Reader | **FeedVine**                        |
| ------------------------------ | ------------------ | ------------------ | ------- | --------------- | ----------------------------------- |
| **Price**                      | Free / $8 / $18/mo | Free / $7 / $10/mo | $5/mo   | $8/mo           | Free / $6 / $14 / $24/mo            |
| Read/unread tracking           | ✅                 | ✅                 | ✅      | ✅              | ✅                                  |
| Save/bookmark                  | ✅                 | ✅                 | ✅      | ✅              | ✅                                  |
| Categories/folders             | ✅                 | ✅                 | ✅      | ✅              | ✅                                  |
| Keyboard shortcuts             | ✅                 | ✅                 | ✅      | ✅              | ✅                                  |
| OPML import/export             | ✅                 | ✅                 | ✅      | ✅              | ✅                                  |
| Mark all as read               | ✅                 | ✅                 | ✅      | ✅              | ✅                                  |
| Article search                 | ✅                 | ✅                 | ✅      | ✅              | ✅                                  |
| Full-text fetch                | ✅                 | ✅                 | ✅      | ✅              | ✅ (Creator+)                       |
| Reading time estimate          | ❌                 | ❌                 | ❌      | ✅              | ✅                                  |
| AI summaries                   | ✅ ($18/mo Leo)    | ❌                 | ❌      | ✅              | ✅ (Creator+, 200/mo)               |
| Filter/keyword rules           | Paid               | ✅ (flagship)      | ❌      | ❌              | ✅ (Creator+)                       |
| Scheduled auto-draft           | ❌                 | ❌                 | ❌      | ❌              | ✅ (Creator+, Beehiiv + MailerLite) |
| Newsletter digest export       | ❌                 | ❌                 | ❌      | ❌              | ✅ (Beehiiv + MailerLite)           |
| Collections/marketplace        | ❌                 | ❌                 | ❌      | ❌              | ✅                                  |
| Webhook system                 | ❌                 | ❌                 | ❌      | ❌              | ✅                                  |
| Public API                     | ❌                 | ✅                 | ✅      | ❌              | ✅ (Builder)                        |
| Email newsletter subscriptions | ❌                 | ❌                 | ✅      | ✅              | ❌ (deferred)                       |
| Team workspaces                | ❌                 | ❌                 | ❌      | ❌              | ✅ (Team $99–$329/mo, 3 tiers)      |
| Shared team collections        | ❌                 | ❌                 | ❌      | ❌              | ✅ (Team plans)                     |
| Slack bot                      | ❌                 | ❌                 | ❌      | ❌              | ✅ (Team plans)                     |
| Discord bot                    | ❌                 | ❌                 | ❌      | ❌              | ✅ (Team plans)                     |
| Digest history                 | ❌                 | ❌                 | ❌      | ❌              | ✅ (Pro+)                           |
| PWA / installable app          | ❌                 | ❌                 | ❌      | ❌              | ✅                                  |
| Onboarding wizard              | ❌                 | ❌                 | ❌      | ❌              | ✅                                  |
| Usage analytics / feed health  | ❌                 | ❌                 | ❌      | ❌              | ✅                                  |
| Quiet hours / digest controls  | ❌                 | ❌                 | ❌      | ❌              | ✅                                  |

---

## Where FeedVine Wins Today

- **Scheduled auto-draft** — Only RSS reader that auto-creates newsletter drafts in Beehiiv + MailerLite
- **Webhook system** — No competitor offers Zapier/Make-style webhooks
- **Newsletter digest builder** — One-click export to Beehiiv + MailerLite with full digest history
- **AI summaries at a fair price** — Competitor charges $18/mo; FeedVine includes it at $14/mo (Creator+)
- **Keyword filters** — On par with Inoreader's flagship feature
- **Collections & marketplace** — Curated shared feed lists + shared team collections
- **Public API** — Full REST API with hashed key management and rate limiting
- **Slack & Discord bots** — Interactive slash commands for RSS-to-channel delivery (Team plans)
- **Team workspaces** — Full B2B offering with 3 tiers, shared collections, and bot integrations

---

## Roadmap: Closing the Gaps

### 🔴 Phase A — Core Reader Parity (Must-haves)

| #   | Feature                   | Impact                    | Effort   | Status  |
| --- | ------------------------- | ------------------------- | -------- | ------- |
| 1   | **OPML import/export**    | Migration unlock          | 1–2 days | ✅ Done |
| 2   | **Mark all as read**      | Expected behavior         | ~0.5 day | ✅ Done |
| 3   | **Article search**        | Power user retention      | 1–2 days | ✅ Done |
| 4   | **Full-text fetch**       | Many feeds are truncated  | 2–3 days | ✅ Done |
| 5   | **Reading time estimate** | Visible engagement signal | ~1 hour  | ✅ Done |

### 🟡 Phase B — Differentiation (Justify the price)

| #   | Feature                                        | Impact                                       | Effort   | Status  |
| --- | ---------------------------------------------- | -------------------------------------------- | -------- | ------- |
| 6   | **AI article summaries**                       | Biggest WOW moment; Creator+ (200/mo cap)    | 1–2 days | ✅ Done |
| 7   | **Pricing restructure + 30-day trial**         | Reduce signup friction                       | 1 day    | ✅ Done |
| 8   | **Keyword filter rules**                       | Power user retention; Creator+               | 2–3 days | ✅ Done |
| 9   | **Scheduled auto-draft to Beehiiv/MailerLite** | Set-and-forget newsletter workflow; Creator+ | 2–3 days | ✅ Done |

### 🟢 Phase C — Growth & B2B ✅ Fully Deployed

| #   | Feature                     | Impact                                                           | Effort    | Status      |
| --- | --------------------------- | ---------------------------------------------------------------- | --------- | ----------- |
| 10  | **Team workspaces**         | Path to $10k MRR; 3 tiers: $99/5 seats, $199/15, $329/30         | 1–2 weeks | ✅ Done     |
| 11  | **Shared team collections** | Fixes Team Starter false advertising; core collaboration feature | 3–5 days  | ✅ Done     |
| 12  | **Slack bot**               | Highest B2B acquisition lever; gate behind Team plan             | 2–3 days  | ✅ Done     |
| 13  | **Email newsletter inbox**  | Feedbin/Readwise parity; new audience segment; Creator+          | 3–4 days  | ⏸️ Deferred |
| 14  | **Digest history**          | Reference past digests; low effort, high retention               | 1 day     | ✅ Done     |
| 15  | **Discord bot**             | Communities                                                      | 1–2 days  | ✅ Done     |

**Deployment details**: All edge functions deployed (`manage-team`, `slack-oauth`, `slack-commands`, `slack-deliver`, `discord-oauth`, `discord-commands`, `discord-deliver`). RLS chain fixed with `SECURITY DEFINER` helpers (`is_team_member`, `is_team_admin`). Migrations 023–029 applied.

### 🔵 Phase D — Retention & Polish ✅ Fully Deployed

| #   | Feature                        | Impact                                           | Effort   | Status      |
| --- | ------------------------------ | ------------------------------------------------ | -------- | ----------- |
| 16  | **Email newsletter inbox**     | Feedbin/Readwise parity; moved from Phase C      | 3–4 days | ⏸️ Deferred |
| 17  | **Mobile PWA / responsive UI** | Installable app, fast loads via service worker   | 1 day    | ✅ Done     |
| 18  | **Onboarding flow**            | Reduce churn in first 48h; guided setup wizard   | 1 day    | ✅ Done     |
| 19  | **Usage analytics dashboard**  | Reading stats, streak, top feeds, feed health    | 1–2 days | ✅ Done     |
| 20  | **Notification preferences**   | Quiet hours, expanded digest frequencies         | 1 day    | ✅ Done     |

**Deployment details**: PWA via `vite-plugin-pwa` with Workbox caching. Onboarding tracks completion in `user_metadata`. Analytics uses server-side Postgres RPCs (`analytics-stats` edge function). Digest schedules expanded to 7 frequencies (hourly through weekly). Quiet hours stored in `user_preferences` table. Migrations 030–031 applied.

---

## Notes

- **OPML** is the XML standard used by every RSS reader. Export lets users leave; import lets users arrive.
- **AI summaries** are the single highest perceived-value add. Competitor charges $18/mo specifically for this.
- **Full-text fetch** solves the frustration of feeds that only publish summaries (most enterprise blogs do this).
- **Scheduled auto-draft** turns the manual digest builder into a zero-effort retention driver.
- **Team workspaces** are live across 3 tiers ($99/$199/$329/mo) with shared team collections for true collaboration.
- **Slack & Discord bots** deliver articles to team channels with interactive `/feedvine` slash commands — gated behind Team plans.
- **Digest history** saves every exported or auto-drafted digest for future reference and re-use.
- **Email newsletter inbox** is deferred — closes the gap vs Feedbin/Readwise Reader but was deprioritized in favor of B2B features.
- **Phase C infrastructure**: RLS policies use `SECURITY DEFINER` helper functions to avoid multi-level policy chains. Team plan check exempts `get`/`accept` actions so all users can check for pending invites.
- **PWA**: Manifest + Workbox service worker for app shell caching; network-first strategy for Supabase API calls.
- **Onboarding**: 4-step wizard (Welcome → Add feeds/OPML → Create collection → Done). Tracks completion in Supabase `user_metadata.onboarding_complete`.
- **Analytics**: Server-side RPCs for reading stats, streak, top feeds, and feed health. Recharts for the 30-day reads chart.
- **Quiet hours**: `user_preferences` table stores per-user quiet hours (start/end/timezone). `send-scheduled-digest` skips delivery during quiet hours.
