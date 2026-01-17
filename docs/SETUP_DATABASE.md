# Database Setup Guide

This guide will help you set up the database tables for your RSS Aggregator.

## Option 1: Using Supabase Dashboard (Recommended for Quick Setup)

1. **Go to your Supabase project dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the migrations in order**

   **First, run `001_initial_schema.sql`:**
   - Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for success message

   **Then, run `003_subscriptions.sql`:**
   - Copy the entire contents of `supabase/migrations/003_subscriptions.sql`
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for success message

4. **Verify the tables were created**
   - Click on "Table Editor" in the left sidebar
   - You should see these tables:
     - `feeds`
     - `articles`
     - `categories`
     - `feed_categories`
     - `subscriptions`

## Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project ref)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Verify Setup

After running the migrations, test by:

1. **Sign in to your app**
2. **Try adding a feed** (e.g., `https://hnrss.org/frontpage`)
3. **Check if it appears** in your feeds list

## Troubleshooting

### "Could not find the table" error
- Make sure you ran both migration files
- Check the Supabase dashboard Table Editor to verify tables exist
- Verify your `.env` file has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "Permission denied" error
- The migrations include Row Level Security (RLS) policies
- Make sure you're signed in to the app
- Check that the policies were created in Supabase Dashboard → Authentication → Policies

### Tables exist but can't insert data
- Check RLS policies in Supabase Dashboard
- Verify you're authenticated (check browser console for auth errors)
- Make sure the `auth.users` table has your user record

## What Gets Created

### Tables:
- **feeds**: Stores RSS feed URLs and metadata
- **articles**: Stores individual articles from feeds
- **categories**: User-defined categories for organizing feeds
- **feed_categories**: Junction table linking feeds to categories
- **subscriptions**: Stripe subscription data for billing

### Security:
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Policies enforce user isolation

### Indexes:
- Optimized for common queries
- Fast lookups by user_id, feed_id, published_at
- Efficient filtering by read/saved status

## Next Steps

After setting up the database:

1. ✅ Add some RSS feeds
2. ✅ Test the article fetching (note: you'll need to implement a backend service to actually fetch RSS feeds)
3. ✅ Try organizing feeds into categories
4. ✅ Test the read/saved functionality
5. ✅ Set up Stripe for subscriptions (see STRIPE_SETUP.md)

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase Dashboard → Logs for database errors
3. Verify your environment variables are correct
4. Make sure you're signed in to the app

