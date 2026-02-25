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
| Email newsletter subscriptions | ❌                 | ❌                 | ✅      | ✅              | ❌                                  |
| Team workspaces                | ❌                 | ❌                 | ❌      | ❌              | ❌ → **Planned**                    |

---

## Where FeedVine Wins Today

- **Scheduled auto-draft** — Only RSS reader that auto-creates newsletter drafts in Beehiiv + MailerLite
- **Webhook system** — No competitor offers Zapier/Make-style webhooks
- **Newsletter digest builder** — One-click export to Beehiiv + MailerLite
- **AI summaries at a fair price** — Competitor charges $18/mo; FeedVine includes it at $14/mo (Creator+)
- **Keyword filters** — On par with Inoreader's flagship feature
- **Collections & marketplace** — Curated shared feed lists
- **Public API** — Full REST API with hashed key management and rate limiting

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

### 🟢 Phase C — Growth & B2B

| #   | Feature                 | Impact                                      | Effort    | Status     |
| --- | ----------------------- | ------------------------------------------- | --------- | ---------- |
| 10  | **Team workspaces**     | Path to $10k MRR; $99/mo team plan, 5 seats | 1–2 weeks | 🔲 Planned |
| 11  | **Slack bot**           | B2B/team use case                           | 2–3 days  | 🔲 Planned |
| 12  | **Discord bot**         | Communities                                 | 1–2 days  | 🔲 Planned |
| 13  | **Digest history**      | Reference past digests                      | 1 day     | 🔲 Planned |
| 14  | **Email subscriptions** | Feedbin/Readwise differentiator             | 2 days    | 🔲 Planned |

---

## Notes

- **OPML** is the XML standard used by every RSS reader. Export lets users leave; import lets users arrive.
- **AI summaries** are the single highest perceived-value add. Competitor charges $18/mo specifically for this.
- **Full-text fetch** solves the frustration of feeds that only publish summaries (most enterprise blogs do this).
- **Scheduled auto-draft** turns the manual digest builder into a zero-effort retention driver.
- **Team workspaces** is the single biggest revenue lever — shared collections + seat-based billing at $99/mo.
