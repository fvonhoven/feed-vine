#!/bin/bash

# Test CronNarc Ping for FeedVine RSS Fetch
# This script tests that the fetch-rss function successfully pings CronNarc

echo "🧪 Testing CronNarc Ping for FeedVine RSS Fetch"
echo "================================================"
echo ""

# Configuration
SUPABASE_URL="https://jrjotduzvzbslnbhswxo.supabase.co"
FUNCTION_URL="$SUPABASE_URL/functions/v1/fetch-rss"
CRONNARC_PING_URL="https://cronnarc.com/api/ping/feedvine-rss-fetch-1768922436574"

# Check if SUPABASE_ANON_KEY is set
if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: SUPABASE_ANON_KEY environment variable not set"
  echo ""
  echo "Please set it with:"
  echo "  export SUPABASE_ANON_KEY='your-anon-key'"
  echo ""
  exit 1
fi

echo "📍 Function URL: $FUNCTION_URL"
echo "📍 CronNarc Ping URL: $CRONNARC_PING_URL"
echo ""

# Step 1: Test direct ping to CronNarc
echo "Step 1: Testing direct ping to CronNarc..."
PING_RESPONSE=$(curl -s -w "\n%{http_code}" "$CRONNARC_PING_URL")
PING_HTTP_CODE=$(echo "$PING_RESPONSE" | tail -n1)
PING_BODY=$(echo "$PING_RESPONSE" | sed '$d')

if [ "$PING_HTTP_CODE" = "200" ]; then
  echo "✅ Direct ping successful (HTTP $PING_HTTP_CODE)"
  echo "   Response: $PING_BODY"
else
  echo "⚠️  Direct ping returned HTTP $PING_HTTP_CODE"
  echo "   Response: $PING_BODY"
fi
echo ""

# Step 2: Call the fetch-rss function
echo "Step 2: Calling fetch-rss Edge Function..."
echo "(This will fetch all RSS feeds and ping CronNarc)"
echo ""

FUNCTION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json")

FUNCTION_HTTP_CODE=$(echo "$FUNCTION_RESPONSE" | tail -n1)
FUNCTION_BODY=$(echo "$FUNCTION_RESPONSE" | sed '$d')

if [ "$FUNCTION_HTTP_CODE" = "200" ]; then
  echo "✅ Function executed successfully (HTTP $FUNCTION_HTTP_CODE)"
  echo ""
  echo "Response:"
  echo "$FUNCTION_BODY" | jq '.' 2>/dev/null || echo "$FUNCTION_BODY"
else
  echo "❌ Function failed (HTTP $FUNCTION_HTTP_CODE)"
  echo ""
  echo "Response:"
  echo "$FUNCTION_BODY"
  exit 1
fi
echo ""

# Step 3: Wait a moment and check CronNarc again
echo "Step 3: Verifying CronNarc received the ping..."
echo "(Waiting 2 seconds...)"
sleep 2

VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" "$CRONNARC_PING_URL")
VERIFY_HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
VERIFY_BODY=$(echo "$VERIFY_RESPONSE" | sed '$d')

if [ "$VERIFY_HTTP_CODE" = "200" ]; then
  echo "✅ CronNarc ping verified (HTTP $VERIFY_HTTP_CODE)"
  echo "   Response: $VERIFY_BODY"
else
  echo "⚠️  Verification returned HTTP $VERIFY_HTTP_CODE"
  echo "   Response: $VERIFY_BODY"
fi
echo ""

# Summary
echo "================================================"
echo "✅ Test Complete!"
echo ""
echo "Next steps:"
echo "1. Check your CronNarc dashboard at https://cronnarc.com"
echo "2. Verify the 'feedvine-rss-fetch' monitor shows recent activity"
echo "3. The cron job will automatically ping every hour"
echo ""

