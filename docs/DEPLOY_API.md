# 🚀 Deploying FeedVine API

This guide walks you through deploying all the API edge functions to Supabase.

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Logged in to Supabase**
   ```bash
   supabase login
   ```

3. **Linked to your project**
   ```bash
   cd feed-vine
   supabase link --project-ref your-project-ref
   ```

---

## Step 1: Run Database Migration

First, create the API keys tables:

```bash
supabase db push
```

This will apply the migration `20240115000010_api_keys.sql` which creates:
- `api_keys` table
- `api_rate_limits` table
- Necessary indexes and RLS policies

---

## Step 2: Deploy Edge Functions

Deploy all API-related edge functions:

```bash
# API Key Management
supabase functions deploy api-keys

# API Usage Statistics
supabase functions deploy api-usage-stats

# API v1 Endpoints
supabase functions deploy api-v1-feeds
supabase functions deploy api-v1-articles
supabase functions deploy api-v1-categories
supabase functions deploy api-v1-collections
```

**Or deploy all at once:**

```bash
supabase functions deploy api-keys && \
supabase functions deploy api-usage-stats && \
supabase functions deploy api-v1-feeds && \
supabase functions deploy api-v1-articles && \
supabase functions deploy api-v1-categories && \
supabase functions deploy api-v1-collections
```

---

## Step 3: Verify Deployment

Check that all functions are deployed:

```bash
supabase functions list
```

You should see:
- ✅ api-keys
- ✅ api-usage-stats
- ✅ api-v1-feeds
- ✅ api-v1-articles
- ✅ api-v1-categories
- ✅ api-v1-collections

---

## Step 4: Test the API

### 1. Create an API Key

First, log in to your FeedVine app and:
1. Make sure you have a Premium subscription
2. Go to **API Keys** page
3. Click **Create New API Key**
4. Copy the key (you'll only see it once!)

### 2. Test with curl

```bash
# Set your API key
export FEEDVINE_API_KEY="sk_live_your_key_here"
export SUPABASE_URL="https://your-project.supabase.co"

# Test: List feeds
curl -H "Authorization: Bearer $FEEDVINE_API_KEY" \
  "$SUPABASE_URL/functions/v1/api-v1-feeds"

# Test: List articles
curl -H "Authorization: Bearer $FEEDVINE_API_KEY" \
  "$SUPABASE_URL/functions/v1/api-v1-articles?limit=10"

# Test: Create category
curl -X POST \
  -H "Authorization: Bearer $FEEDVINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tech","color":"#3B82F6"}' \
  "$SUPABASE_URL/functions/v1/api-v1-categories"
```

### 3. Check Rate Limits

The response headers should include:
```
X-RateLimit-Limit: 2000
X-RateLimit-Remaining: 1999
X-RateLimit-Reset: 1640000000
```

---

## Step 5: Monitor Usage

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on any function to see:
   - Invocation count
   - Error rate
   - Execution time
   - Logs

---

## Troubleshooting

### Function not found (404)
- Make sure the function is deployed: `supabase functions list`
- Check the function name matches the URL path

### Authentication failed (401)
- Verify your API key is correct
- Check that the key hasn't been revoked
- Ensure you have a Premium subscription

### Rate limit exceeded (429)
- Wait for the rate limit window to reset
- Check your current usage in the API Keys page
- Consider upgrading your plan

### Internal server error (500)
- Check function logs: `supabase functions logs api-v1-feeds`
- Verify environment variables are set
- Check database connection

---

## Environment Variables

The edge functions use these environment variables (automatically set by Supabase):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access
- `SUPABASE_ANON_KEY` - Anonymous key for public access

These are automatically available in edge functions, no manual setup needed!

---

## Updating Functions

When you make changes to a function:

```bash
# Deploy the updated function
supabase functions deploy api-v1-feeds

# Check logs for any errors
supabase functions logs api-v1-feeds --tail
```

---

## Security Checklist

Before going to production:

- [ ] All edge functions deployed
- [ ] Database migration applied
- [ ] RLS policies enabled on all tables
- [ ] API keys are hashed in database
- [ ] Rate limiting is working
- [ ] CORS headers are correct
- [ ] Error messages don't leak sensitive info
- [ ] API documentation is published
- [ ] Test API keys created and tested
- [ ] Production API keys secured

---

## Next Steps

1. **Update API documentation URL** in `ApiKeysPage.tsx`
2. **Create example integrations** (Zapier, Make, etc.)
3. **Build client libraries** (optional)
4. **Monitor API usage** and adjust rate limits if needed
5. **Collect user feedback** on API usability

---

**Deployment Status:** Ready to deploy! 🚀

