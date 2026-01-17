# Feed Collections - Aggregated RSS/JSON Feeds for Automation

## 🎯 What This Does

Create **custom aggregated feeds** that combine multiple RSS sources into a single feed URL. Perfect for:

- **Zapier** - Trigger workflows on new articles
- **IFTTT** - Automate actions based on feed updates
- **Make (Integromat)** - Build complex automation flows
- **Any RSS reader** - Subscribe to your custom aggregated feed

## 📊 How It Works

```
┌─────────────────────────────────────────┐
│  CREATE COLLECTION: "AI News"           │
│  ├─ TechCrunch AI                       │
│  ├─ Google Research                     │
│  ├─ Hacker News                         │
│  └─ The Verge AI                        │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  GET PUBLIC URL:                        │
│  https://your-project.supabase.co/      │
│    functions/v1/serve-collection/       │
│    ai-news.rss                          │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  USE IN ZAPIER/IFTTT/etc                │
│  - Trigger on new items                 │
│  - Send to Slack, email, etc.           │
│  - Filter by keywords                   │
│  - Create custom workflows              │
└─────────────────────────────────────────┘
```

## 🚀 Setup Instructions

### Step 1: Run Database Migration

```bash
cd rss-aggregator
```

Then run the migration in Supabase:

**Option A: Using Supabase CLI**

```bash
supabase db push
```

**Option B: Using Supabase Dashboard**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/004_feed_collections.sql`
5. Click **Run**

### Step 2: Deploy Edge Function

```bash
# Deploy the serve-collection function
supabase functions deploy serve-collection
```

### Step 3: Test the Setup

1. **Start your app**:

   ```bash
   npm run dev
   ```

2. **Navigate to Collections**:

   - Click "Collections" in the sidebar
   - Click "Create Collection"

3. **Create a test collection**:

   - Name: "Tech News"
   - Slug: "tech-news" (auto-generated)
   - Description: "Latest tech news from multiple sources"
   - Public: ✅ (checked)
   - Output Format: "Both RSS and JSON"
   - **Select feeds**: Check the boxes for feeds you want to include (e.g., TechCrunch, Hacker News)
   - You can also add more feeds later using "+ Add Feed"

4. **Get your feed URL**:
   - Copy the RSS or JSON URL
   - Example: `https://your-project.supabase.co/functions/v1/serve-collection/tech-news.rss`

## 📝 Using in Zapier

### Create a Zap

1. **Trigger**: RSS by Zapier

   - Event: "New Item in Feed"
   - Feed URL: Paste your collection URL
   - Example: `https://your-project.supabase.co/functions/v1/serve-collection/tech-news.rss`

2. **Action**: Choose what to do with new articles
   - Send to Slack
   - Create Google Doc
   - Send email
   - Post to Twitter/X
   - Save to Notion
   - etc.

### Example Zaps

**1. Tech News to Slack**

- Trigger: New item in your "tech-news" collection
- Action: Send channel message in Slack
- Message: `New article: {{title}} - {{link}}`

**2. AI Research to Notion**

- Trigger: New item in your "ai-research" collection
- Action: Create database item in Notion
- Fields: Title, URL, Description, Published Date

**3. Industry News Digest**

- Trigger: New item in your "industry-news" collection
- Filter: Only if title contains specific keywords
- Action: Add to daily digest email

## 🔧 Advanced Features

### Output Formats

**RSS (XML)**

```
https://your-project.supabase.co/functions/v1/serve-collection/your-slug.rss
```

- Standard RSS 2.0 format
- Works with all RSS readers
- Best for Zapier, IFTTT

**JSON Feed**

```
https://your-project.supabase.co/functions/v1/serve-collection/your-slug.json
```

- JSON Feed 1.1 format
- Easier to parse programmatically
- Great for custom integrations

### Public vs Private Collections

**Public Collections** (is_public = true)

- ✅ Accessible without authentication
- ✅ Works in Zapier, IFTTT, RSS readers
- ✅ Can be shared with anyone
- ⚠️ Anyone with the URL can access

**Private Collections** (is_public = false)

- 🔒 Requires authentication
- 🔒 Only you can access
- ⚠️ Won't work in most automation tools

**Recommendation**: Use public collections for automation tools.

## 📊 Collection Management

### Creating Collections

1. Click "Create Collection"
2. Enter a name (e.g., "AI News")
3. Slug is auto-generated (e.g., "ai-news")
4. Add description (optional)
5. Choose output format (RSS, JSON, or both)
6. Make it public for automation tools

### Adding Feeds

1. Click "+ Add Feed" on a collection
2. Select from your existing feeds
3. Feed articles will appear in the collection immediately

### Removing Feeds

1. Click "Remove" next to a feed in the collection
2. Articles from that feed will no longer appear

### Deleting Collections

1. Click the trash icon on a collection
2. This will delete the collection and all its feed associations
3. Original feeds and articles are NOT deleted

## 🎨 Use Cases

### 1. Industry Monitoring

**Collection**: "Competitor News"

- Add feeds from competitor blogs
- Zapier → Slack notification
- Stay updated on competitor announcements

### 2. Content Curation

**Collection**: "Weekly Newsletter"

- Add feeds from industry sources
- Zapier → Save to Notion database
- Review and curate for newsletter

### 3. Research Tracking

**Collection**: "AI Research"

- Add academic and research blogs
- Zapier → Google Sheets
- Track research trends over time

### 4. Social Media Automation

**Collection**: "Share-worthy Content"

- Add high-quality sources
- Zapier → Buffer/Hootsuite
- Auto-share to social media

## 🔍 Troubleshooting

### "Collection not found" error

- Check that the slug is correct
- Verify the collection is marked as public
- Ensure the Edge Function is deployed

### No articles appearing

- Make sure feeds are added to the collection
- Check that feeds have been fetched (go to Feeds page and refresh)
- Verify articles exist in the database

### Zapier not triggering

- Test the feed URL in a browser first
- Make sure collection is public
- Check that new articles are being added
- Zapier checks feeds every 15 minutes (on free plan)

## 🎉 You're All Set!

You now have a powerful feed aggregation system that can:

- ✅ Combine multiple RSS feeds into one
- ✅ Generate public RSS and JSON URLs
- ✅ Integrate with Zapier, IFTTT, and other tools
- ✅ Automate your content workflows

**Next Steps**:

1. Create your first collection
2. Add some feeds to it
3. Copy the URL
4. Set up a Zap!

Happy automating! 🚀
