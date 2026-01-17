# RSS Feed Aggregator - Complete Setup Guide

## 🚀 Quick Start Checklist

Follow these steps to get your RSS Feed Aggregator up and running:

### Step 1: Install Dependencies ✅

```bash
cd rss-aggregator
npm install
```

### Step 2: Set Up Supabase

#### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `rss-aggregator`
   - Database Password: (save this securely)
   - Region: Choose closest to you
4. Wait for project to be created (~2 minutes)

#### 2.2 Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" or press `Cmd/Ctrl + Enter`
6. Verify success (should see "Success. No rows returned")

#### 2.3 Get API Credentials

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### Step 3: Configure Environment Variables

1. Create `.env.local` file in the `rss-aggregator` directory:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Deploy RSS Fetch Edge Function

#### 4.1 Install Supabase CLI

```bash
npm install -g supabase
```

#### 4.2 Login and Link Project

```bash
# Login to Supabase
supabase login

# Link to your project (get project ref from dashboard URL)
supabase link --project-ref your-project-ref
```

#### 4.3 Deploy the Function

```bash
supabase functions deploy fetch-rss
```

#### 4.4 Set Up Automatic Fetching (Optional)

To automatically fetch RSS feeds every hour:

1. In Supabase dashboard, go to **Database** → **Extensions**
2. Enable `pg_cron` extension
3. Go to **SQL Editor** and run:

```sql
SELECT cron.schedule(
  'fetch-rss-hourly',
  '0 * * * *',  -- Every hour
  $$
  SELECT net.http_post(
    url:='https://YOUR-PROJECT-REF.supabase.co/functions/v1/fetch-rss',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

Replace `YOUR-PROJECT-REF` and `YOUR_ANON_KEY` with your actual values.

### Step 5: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser!

### Step 6: Test the Application

1. **Sign Up**: Create a new account
2. **Add a Feed**: Go to "Feeds" page and add an RSS feed URL
   - Example feeds to try:
     - `https://hnrss.org/frontpage` (Hacker News)
     - `https://techcrunch.com/feed/` (TechCrunch)
     - `https://www.theverge.com/rss/index.xml` (The Verge)
3. **Fetch Articles**: Manually trigger the fetch function:

```bash
curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/fetch-rss' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

4. **View Articles**: Go back to home page and see your articles!

## 🌐 Deploy to Netlify

### Option 1: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

### Option 2: Netlify Dashboard

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Click "Deploy site"

## 🔧 Troubleshooting

### Build Fails

- Make sure all dependencies are installed: `npm install`
- Check TypeScript errors: `npm run build`
- Verify environment variables are set

### No Articles Showing

- Check if feeds were added successfully
- Manually trigger RSS fetch function
- Check Supabase logs for errors
- Verify RLS policies are set up correctly

### Authentication Issues

- Verify Supabase URL and anon key are correct
- Check browser console for errors
- Make sure email confirmation is disabled in Supabase Auth settings (for development)

### RSS Fetch Errors

- Verify the RSS feed URL is valid and accessible
- Check Edge Function logs in Supabase dashboard
- Some feeds may require specific User-Agent headers

## 📚 Next Steps

- Add more RSS feeds
- Customize the UI with your branding
- Set up email notifications
- Add AI summarization features
- Integrate with newsletter platforms

## 🆘 Need Help?

- Check Supabase documentation: https://supabase.com/docs
- Vite documentation: https://vitejs.dev
- React Query documentation: https://tanstack.com/query

Happy aggregating! 🎉

