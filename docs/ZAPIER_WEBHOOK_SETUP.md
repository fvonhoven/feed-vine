# Zapier Webhook Integration Setup

## Overview

FeedVine now sends new articles to Zapier via webhooks in real-time as they're ingested. This is more reliable than RSS polling and provides immediate delivery of new content.

## How It Works

1. When FeedVine fetches RSS feeds, it categorizes and inserts new articles into the database
2. **Immediately after** a new article is successfully inserted, it sends the article data to a Zapier webhook
3. Zapier receives the webhook and can trigger any automation (email, Slack, database, etc.)

## Setup Instructions

### Step 1: Create Zapier Webhook Trigger

1. Go to [Zapier](https://zapier.com) and create a new Zap
2. For the trigger, search for **"Webhooks by Zapier"**
3. Choose **"Catch Hook"** as the trigger event
4. Click **Continue**
5. Zapier will show you a **Custom Webhook URL** like:
   ```
   https://hooks.zapier.com/hooks/catch/12345678/abcdefg/
   ```
6. **Copy this URL** - you'll need it in the next step

### Step 2: Add Webhook URL to Supabase

1. Go to your Supabase project: https://supabase.com/dashboard/project/jrjotduzvzbslnbhswxo/settings/secrets
2. Click **"Add new secret"**
3. Set the name to: `ZAPIER_WEBHOOK_URL`
4. Paste the webhook URL from Step 1
5. Click **"Add secret"**

### Step 3: Test the Webhook

1. In FeedVine, refresh one of your feeds (or add a new feed)
2. Go back to Zapier and click **"Test trigger"**
3. You should see the article data appear in Zapier!

### Step 4: Complete Your Zap

Now you can add actions to your Zap to do whatever you want with the article data:
- Send to email
- Post to Slack
- Save to Airtable/Notion
- Send to another API
- etc.

## Webhook Payload Structure

Each webhook sends the following data:

```json
{
  "title": "Article Title",
  "url": "https://example.com/article",
  "description": "Article description or summary",
  "category": "AI News",
  "source": "https://example.com/feed.xml",
  "source_name": "Example Feed",
  "published_at": "2026-01-28T12:00:00Z"
}
```

### Field Descriptions

- **title**: The article headline
- **url**: Direct link to the article (unique identifier)
- **description**: Article summary or excerpt
- **category**: Auto-categorized topic (AI News, Tools, Opinion, Startups, Backend, Tutorial, Research, or Uncategorized)
- **source**: The RSS feed URL where this article came from
- **source_name**: Human-readable name of the feed
- **published_at**: ISO 8601 timestamp of when the article was published

## Filtering in Zapier

You can add **Filter** steps in Zapier to only process certain articles:

### Example: Only AI News Articles
- Add a **Filter** step after the webhook trigger
- Set condition: `category` equals `AI News`

### Example: Only from Specific Sources
- Add a **Filter** step
- Set condition: `source_name` contains `TechCrunch`

### Example: Only Recent Articles
- Add a **Filter** step
- Set condition: `published_at` is within the last 24 hours

## Troubleshooting

### No webhooks arriving in Zapier?

1. **Check the secret is set**: Go to Supabase secrets and verify `ZAPIER_WEBHOOK_URL` exists
2. **Check the logs**: Go to https://supabase.com/dashboard/project/jrjotduzvzbslnbhswxo/functions/fetch-rss/logs
   - Look for messages like: `"Sending article to Zapier: ..."`
   - Look for success: `"✓ Successfully sent article to Zapier: ..."`
   - Look for errors: `"Failed to send to Zapier: ..."`
3. **Refresh a feed**: Manually refresh a feed in FeedVine to trigger new article ingestion
4. **Check Zapier webhook history**: In your Zap, click on the webhook trigger to see recent webhook receipts

### Webhooks failing?

- Check the Supabase function logs for error messages
- Verify the webhook URL is correct (no extra spaces, complete URL)
- Make sure the Zap is turned ON in Zapier

### Only want certain articles?

- Use Zapier's **Filter** feature to filter by category, source, or any other field
- You can also modify the Edge Function to add custom filtering logic before sending

## Rate Limits

- Zapier webhook triggers support **100+ webhooks per minute** on most plans
- FeedVine sends one webhook per new article
- If you're ingesting hundreds of articles at once, they'll all be sent (Zapier queues them)

## Cost

- Webhooks count as **Zap runs** in Zapier
- Free plan: 100 tasks/month
- Starter plan: 750 tasks/month
- Professional plan: 2,000+ tasks/month

Each new article = 1 task (plus any actions you add to the Zap)

## Advanced: Multiple Webhooks

You can set up multiple webhooks for different purposes:

1. Create multiple Zaps with different webhook URLs
2. In Supabase, you could add multiple secrets: `ZAPIER_WEBHOOK_URL_1`, `ZAPIER_WEBHOOK_URL_2`, etc.
3. Modify the Edge Function to send to multiple webhooks

## Disabling Webhooks

To temporarily disable webhooks:
1. Go to Supabase secrets
2. Delete or rename the `ZAPIER_WEBHOOK_URL` secret
3. Articles will still be ingested, but webhooks won't be sent

To re-enable:
1. Add the secret back with the webhook URL

