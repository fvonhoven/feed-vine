# Security Fixes Applied (March 2026)

This document summarizes the security fixes applied following the XSS, SQL injection, and OWASP audit.

## P0 – Critical

### 1. Auth for Unauthenticated Edge Functions
- **fetch-rss**: Requires JWT (user) or `X-Cron-Secret` / Bearer service key (cron). Validates feed ownership when `feedId` is provided.
- **slack-deliver**, **discord-deliver**: Require Bearer service key or `X-Cron-Secret`.
- **send-scheduled-digest**: Requires `X-Cron-Secret` or Bearer service key.

**Action required:** Set `CRON_SECRET` in Supabase Edge Function secrets. Update cron jobs to pass `X-Cron-Secret` header or `?secret=` query param. See `setup-cron.sql` and `docs/NEXT_STEPS.md`.

### 2. SSRF Prevention
- **fetch-full-text**: Validates URL (https only, no internal IPs) before fetching.
- **fetch-rss**: Validates `discoverUrl` and `feedUrl` before fetch; validates feed URLs from DB.
- **slack-commands**: Validates `response_url` before POST.
- **webhooks**: Validates webhook URL before firing.

### 3. Digest HTML/Markdown XSS
- **DigestPage.tsx** and **send-scheduled-digest**: All user/RSS content is HTML-escaped before insertion. URLs validated (http/https only).

## P1 – High

### 4. SQL Injection via `.or()` Filters
- **api-v1-articles**, **discord-commands**, **slack-commands**, **HomePage**, **SearchPage**: All search/filter inputs are escaped with `escapeFilterValue()` before use in PostgREST `.or()` filters.

### 5. Open Redirect
- **create-portal-session**: `returnUrl` validated against allowlist (feedvine.app, localhost).
- **create-checkout-session**: Origin header validated for success/cancel URLs.

### 6. Slack Signature Verification
- **slack-commands**: Implements HMAC-SHA256 verification of `X-Slack-Signature`. Rejects requests when `SLACK_SIGNING_SECRET` is missing or verification fails.

### 7. javascript: URL Injection
- **ArticleCard**, **HomePage**: Article URLs validated with `isSafeUrl()` before use in `href` and `window.open()`.

### 8. Mass Assignment / Privilege Escalation
- **manage-team**: `role` restricted to `member` or `admin`; `owner` cannot be set via invite.
- **manage-team**: Invite accept verifies authenticated user's email matches invite email.

## P2 – Medium

### 9. Input Validation
- **api-v1-collections**: `feed_ids` validated as UUIDs; only feeds owned by user are linked.
- **api-v1-collections**: `output_format` restricted to `rss` or `atom`.

### 10. Error Handling
- **create-checkout-session**: Returns generic "Unauthorized" instead of raw auth error details.

### 11. Sensitive Logging
- **stripe-webhook**: Removed logs containing userId, metadata, full payloads.
- **create-checkout-session**: Removed debug logs.

## New Files

- `supabase/functions/_shared/security.ts` – URL validation, HTML escape, filter escape, return URL validation, cron/auth check.
- `supabase/functions/_shared/slackVerify.ts` – Slack request signature verification.
- `src/lib/urlUtils.ts` – Frontend `isSafeUrl()` and `escapeFilterValue()`.

## Deployment Notes

1. Set `CRON_SECRET` in Supabase Edge Function secrets.
2. Update cron jobs (pg_cron, CronNarc, GitHub Actions) to pass `X-Cron-Secret` or `?secret=` with the same value.
3. Redeploy affected edge functions: `fetch-rss`, `slack-deliver`, `discord-deliver`, `send-scheduled-digest`, `fetch-full-text`, `slack-commands`, `create-portal-session`, `create-checkout-session`, `manage-team`, `api-v1-articles`, `api-v1-collections`, `discord-commands`, and any that use `_shared/webhooks.ts`.
