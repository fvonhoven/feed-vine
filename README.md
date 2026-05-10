# FeedVine - A RSS Feed Aggregator - Micro-SaaS MVP

A modern, Feedly-like RSS feed aggregator built for power users. Aggregate multiple RSS feeds, track what you've read, save articles for later, and export your feed for automation with Zapier or IFTTT.

## 🚀 Live Demo

Try the app in **demo mode** - no signup required! Just visit the app and start exploring.

## ✨ Features

### Core Features

- 🔐 **User Authentication** - Secure email/password auth with Supabase
- 📰 **Feed Management** - Add unlimited RSS feeds with category organization
- 📊 **Unified Article Feed** - All your articles in one beautiful, chronological feed
- ✓ **Read/Unread Tracking** - Auto-mark articles as read when you click them
- ⭐ **Save for Later** - Bookmark important articles to your Saved page
- 🔍 **Advanced Filtering** - Search by keyword, filter by source, date range, or show only unread
- ⌨️ **Keyboard Shortcuts** - Navigate like a pro (j/k, m, s, r, ?, and more)
- 🌙 **Dark Mode** - Beautiful dark theme that's easy on the eyes
- 📱 **Responsive Design** - Works perfectly on desktop, tablet, and mobile

### Micro-SaaS Features

- 🔍 **Feed Discovery** - Browse and add popular feeds from curated categories (AI, Tech, Startups, Design, etc.)
- 📤 **RSS Export** - Download your aggregated feed as RSS for use with other tools
- 🔗 **Integration Ready** - Copy your feed URL for Zapier, IFTTT, or any RSS reader
- 💡 **Integration Ideas** - Built-in suggestions for automating your workflow
- 🎯 **Landing Page** - Professional landing page with features, pricing, and CTAs

### Developer Experience

- ⚡ **Real-time Updates** - React Query for instant data synchronization
- 🚀 **Fast Performance** - Vite + React 18 for lightning-fast load times
- 🎨 **Modern UI** - Tailwind CSS with beautiful gradients and animations
- 📦 **Demo Mode** - Try the app without signing up using mock data

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Deployment:** Netlify
- **Libraries:** React Query, React Router, date-fns, react-hot-toast

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Netlify account (for deployment)

### 1. Clone and Install

```bash
cd rss-aggregator
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Deploy Edge Functions (RSS fetching and webhooks):

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# fetch-rss — scheduled feed fetch; also delivers user webhooks (uses _shared/webhooks.ts)
supabase functions deploy fetch-rss

# test-webhook — optional; powers “Send Test” on the Webhooks settings page only
supabase functions deploy test-webhook
```

After you change `supabase/functions/_shared/webhooks.ts`, redeploy **`fetch-rss`** so live webhook deliveries pick up the change. After you change `test-webhook/`, redeploy **`test-webhook`**.

If “Send Test” returns **401**, the deployed function may still have JWT verification enabled. Project `supabase/config.toml` includes `[functions.test-webhook] verify_jwt = false` — redeploy **`test-webhook`** so that applies, or the gateway can reject the request before your code runs.

4. Set up a cron job (optional):
   - Go to Database → Extensions → Enable `pg_cron`
   - Run this SQL to schedule hourly fetches:

```sql
SELECT cron.schedule(
  'fetch-rss-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project-ref.supabase.co/functions/v1/fetch-rss',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

### 3. Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
```

## Deployment to Netlify

### Option 1: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Option 2: Netlify UI

1. Push code to GitHub
2. Connect repository in Netlify
3. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy!

## 📖 Usage Guide

### Getting Started

1. **Try Demo Mode** - Click "Try Demo Mode" on the auth page to explore without signing up
2. **Sign Up** - Create an account with your email and password
3. **Discover Feeds** - Browse the Discover page to add popular feeds from curated categories
4. **Add Custom Feeds** - Go to "Feeds" page and add any RSS feed URL
5. **Browse Articles** - View all your articles in one unified feed on the home page

### Power User Features

#### Keyboard Shortcuts (Press `?` to see all)

- `j` / `k` - Navigate down/up through articles
- `m` - Mark selected article as read/unread
- `s` - Save/unsave selected article
- `r` - Refresh articles
- `u` - Toggle unread only filter
- `/` - Focus search
- `?` - Show keyboard shortcuts help
- `Esc` - Close modals

#### Filtering & Search

- **Keyword Search** - Find articles by title or description
- **Source Filter** - Filter by specific feed
- **Date Range** - Show articles from last 24h, week, month, or custom range
- **Unread Only** - Toggle to show only unread articles
- **Saved Page** - Access all your bookmarked articles

#### Export & Integration

1. Go to **Settings** page
2. Click **"Download RSS Feed"** to get an XML file of your aggregated feed
3. Click **"Copy Feed URL"** to get a shareable URL for integrations
4. Use the URL with:
   - **Zapier** - Send new articles to Slack, email, or 1000+ apps
   - **IFTTT** - Create automated workflows
   - **RSS Readers** - Import into Feedly, Inoreader, etc.
   - **Email Tools** - Create custom digests

## Project Structure

```
rss-aggregator/
├── src/
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Supabase client
│   ├── pages/           # Page components
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── supabase/
│   ├── schema.sql       # Database schema
│   └── functions/       # Edge functions
├── public/              # Static assets
└── package.json
```

## Future Enhancements

- [ ] AI-powered article summarization
- [ ] Email digest export
- [ ] Beehiiv integration
- [ ] Saved custom filters
- [ ] Browser extension
- [ ] Team workspaces
- [ ] Stripe billing

## License

MIT
