# FeedVine Studio setup

FeedVine Studio turns selected RSS articles into reviewable newsletter and Instagram drafts. It is enabled for Creator, Builder, and team subscriptions.

## Deploy

From the repository root:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set ANTHROPIC_API_KEY=YOUR_KEY
supabase functions deploy generate-studio-draft
npm run build
```

Migration `035_studio.sql` creates brand profiles, per-feed source policies, draft campaigns, campaign items, usage counters, indexes, and row-level security policies.

## Product limits

- Creator: 30 Studio generations per calendar month.
- Builder and team plans: unlimited Studio generations.
- Free and Starter: upgrade prompt only.

The frontend entitlement is defined in `src/lib/stripe.ts`. The matching server-side limit is defined in `supabase/functions/generate-studio-draft/index.ts`; keep both aligned when changing plans.

## Editorial safeguards

- Every feed starts in `link_only` mode.
- `open` and `licensed` sources require a license/agreement name, URL, commercial-use permission, and adaptation permission before Studio sends expanded source material to the model.
- `blocked` sources cannot be included.
- Source material is marked as untrusted input in the model prompt.
- Generated headlines, commentary, newsletter intros, and Instagram captions are checked for source overlap of eight consecutive normalized words.
- Copy that fails the overlap check is replaced with conservative link-forward text.
- Publisher images are never imported into Studio output.
- Every item stores a source URL and attribution.
- Export buttons remain disabled until the user explicitly approves the draft.

These controls support an attribution-first editorial workflow; they do not determine fair use or grant permission. The product UI tells users to review every draft and the underlying source terms before publishing.

## Smoke test

1. Sign in with a Creator-or-higher account.
2. Open **Studio** from the sidebar.
3. Save a brand profile (the KlassikCocktails preset is included).
4. Review and save a policy for each feed.
5. Select one to ten recent articles and generate a draft.
6. Edit the draft, open each original source, and approve it.
7. Confirm the newsletter and Instagram copy buttons unlock only after approval.
8. Refresh Studio and confirm the campaign appears under **Recent drafts** and can be reopened.

Recent drafts are loaded from `studio_campaigns` with their `studio_campaign_items`. Users can edit, approve, duplicate, or permanently delete their own campaigns; row-level security continues to scope every operation to the signed-in user.
