# 🚨 URGENT: Run This Migration Now

Your Supabase keys are correct, but the database tables need to be created!

## ⚡ Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor

Click this link (it will open directly to the SQL editor):
👉 https://supabase.com/dashboard/project/jrjotduzvzbslnbhswxo/sql/new

### Step 2: Copy the Migration

1. Open this file in your code editor:
   ```
   rss-aggregator/supabase/migrations/000_run_this_first.sql
   ```

2. **Select ALL** the contents (Cmd+A / Ctrl+A)

3. **Copy** (Cmd+C / Ctrl+C)

### Step 3: Run the Migration

1. **Paste** into the Supabase SQL Editor (Cmd+V / Ctrl+V)

2. **Click "RUN"** button (bottom right corner)

3. Wait for the success message ✅

### Step 4: Verify

1. Go to Table Editor:
   👉 https://supabase.com/dashboard/project/jrjotduzvzbslnbhswxo/editor

2. You should see these tables:
   - ✅ feeds
   - ✅ articles
   - ✅ user_articles (NEW - this was missing!)
   - ✅ categories
   - ✅ feed_categories
   - ✅ subscriptions

### Step 5: Restart Your App

```bash
# Stop the dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 6: Test

1. **Sign in** to your app
2. **Go to Feeds page**
3. **Add a feed**: `https://hnrss.org/frontpage`
4. **Success!** 🎉

---

## What Was Wrong?

The app code expects a `user_articles` table to track which articles each user has read/saved, but the original migration didn't include it. I've updated the migration file to include:

- ✅ `user_articles` table
- ✅ Proper indexes for performance
- ✅ Row Level Security policies
- ✅ Automatic timestamp updates

This allows multiple users to have different read/saved states for the same article - much better architecture!

---

## Still Getting Errors?

If you still see errors after running the migration:

1. **Check browser console** for specific error messages
2. **Verify you're signed in** to the app
3. **Try signing out and back in**
4. **Clear browser cache** and reload

The most common issue is browser caching the old schema. A hard refresh (Cmd+Shift+R / Ctrl+Shift+F5) usually fixes it.

