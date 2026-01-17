# 🚀 Quick Start Guide

Get your RSS Aggregator up and running in 5 minutes!

## Step 1: Set Up Database (2 minutes)

### Option A: Copy-Paste Method (Easiest)

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Open the file `supabase/migrations/000_run_this_first.sql`
6. Copy the **entire contents** of the file
7. Paste into the SQL Editor
8. Click **Run** (or press Cmd/Ctrl + Enter)
9. Wait for the success message ✅

That's it! All tables, indexes, and security policies are now created.

### Option B: Using Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project (get your ref from dashboard URL)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Step 2: Verify Setup (30 seconds)

1. In Supabase Dashboard, click **Table Editor**
2. You should see these tables:
   - ✅ feeds
   - ✅ articles
   - ✅ categories
   - ✅ feed_categories
   - ✅ subscriptions

## Step 3: Test Your App (1 minute)

1. Make sure your `.env` file has your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Start the dev server:
   ```bash
   npm run dev
   ```

3. Sign in or create an account

4. Try adding a feed:
   - Go to **Feeds** page
   - Add a test feed: `https://hnrss.org/frontpage`
   - Click **Add Feed**
   - You should see "Feed added successfully!" ✅

## Common Test Feeds

Try these popular RSS feeds:

- **Hacker News**: `https://hnrss.org/frontpage`
- **TechCrunch**: `https://techcrunch.com/feed/`
- **The Verge**: `https://www.theverge.com/rss/index.xml`
- **Reddit Programming**: `https://www.reddit.com/r/programming/.rss`
- **CSS Tricks**: `https://css-tricks.com/feed/`

## Troubleshooting

### "Could not find the table" error
- ✅ Run the SQL migration file in Supabase Dashboard
- ✅ Check Table Editor to verify tables exist
- ✅ Refresh your browser

### "Permission denied" error
- ✅ Make sure you're signed in to the app
- ✅ Check that RLS policies were created (they're in the migration file)
- ✅ Try signing out and back in

### Feed added but no articles appear
- ⚠️ **Note**: The current MVP doesn't automatically fetch articles from RSS feeds
- This requires a backend service (see "Next Steps" below)
- For now, you can manually add test data or implement the RSS fetching service

## Next Steps

### 1. Implement RSS Feed Fetching
You'll need a backend service to fetch and parse RSS feeds. Options:
- **Supabase Edge Function** (recommended)
- **Cron job** with a serverless function
- **Background worker** (e.g., Node.js script)

### 2. Set Up Stripe Payments
See `STRIPE_SETUP.md` for detailed instructions on:
- Creating Stripe products
- Configuring webhooks
- Deploying Edge Functions
- Testing payments

### 3. Deploy to Production
- **Frontend**: Deploy to Netlify, Vercel, or Cloudflare Pages
- **Database**: Already hosted on Supabase ✅
- **Edge Functions**: Deploy via Supabase CLI

### 4. Add Features
- Email notifications for new articles
- AI-powered article summaries
- Mobile app (React Native)
- Browser extension
- Zapier/IFTTT integrations

## Project Structure

```
rss-aggregator/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and config
│   └── types/          # TypeScript types
├── supabase/
│   ├── migrations/     # Database migrations
│   └── functions/      # Edge Functions
└── public/             # Static assets
```

## Support

- **Database Issues**: Check Supabase Dashboard → Logs
- **Auth Issues**: Check browser console
- **General Help**: See `SETUP_DATABASE.md` for detailed troubleshooting

## What You've Built

✅ Multi-user RSS aggregator with authentication
✅ Feed management and organization
✅ Article reading and saving
✅ Category-based organization
✅ Dark mode support
✅ Responsive design
✅ Stripe payment integration (ready to configure)
✅ Export to RSS for integrations

**You're ready to go!** 🎉

