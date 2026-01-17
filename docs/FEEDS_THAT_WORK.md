# 📰 RSS Feeds That Work (and Don't Work)

## ⚠️ Important: Cloudflare Protection Issue

Some feeds (like OpenAI Blog) are protected by **Cloudflare** which blocks automated requests from CORS proxies. These feeds will show an error:

```
Feed is protected by Cloudflare - cannot fetch from browser. 
This feed needs server-side fetching.
```

This is a limitation of browser-based RSS fetching. To use these feeds, you need to implement server-side fetching (see below).

---

## ✅ Feeds That Work Well

These feeds have been tested and work with the current browser-based fetcher:

### Tech News
- **Hacker News**: `https://hnrss.org/frontpage`
- **Hacker News (Best)**: `https://hnrss.org/best`
- **TechCrunch**: `https://techcrunch.com/feed/`
- **The Verge**: `https://www.theverge.com/rss/index.xml`
- **Ars Technica**: `https://feeds.arstechnica.com/arstechnica/index`
- **Wired**: `https://www.wired.com/feed/rss`

### Development
- **CSS Tricks**: `https://css-tricks.com/feed/`
- **Smashing Magazine**: `https://www.smashingmagazine.com/feed/`
- **Dev.to**: `https://dev.to/feed`
- **freeCodeCamp**: `https://www.freecodecamp.org/news/rss/`

### Reddit
- **r/programming**: `https://www.reddit.com/r/programming/.rss`
- **r/webdev**: `https://www.reddit.com/r/webdev/.rss`
- **r/javascript**: `https://www.reddit.com/r/javascript/.rss`

### Blogs
- **GitHub Blog**: `https://github.blog/feed/`
- **Netlify Blog**: `https://www.netlify.com/blog/index.xml`
- **Vercel Blog**: `https://vercel.com/blog/feed`

---

## ❌ Feeds That Don't Work (Cloudflare Protected)

These feeds are protected and won't work with browser-based fetching:

- **OpenAI Blog**: `https://openai.com/blog/rss/` ❌
- Some other corporate blogs with Cloudflare protection

---

## 🔧 How to Fix Cloudflare-Protected Feeds

To use Cloudflare-protected feeds, you need to implement **server-side RSS fetching**:

### Option 1: Supabase Edge Function (Recommended)

1. Deploy the included Edge Function:
   ```bash
   cd rss-aggregator
   supabase functions deploy fetch-rss
   ```

2. Set up a cron job to run it every hour:
   ```sql
   -- In Supabase SQL Editor
   SELECT cron.schedule(
     'fetch-rss-feeds',
     '0 * * * *',  -- Every hour
     $$
     SELECT net.http_post(
       url := 'https://YOUR_PROJECT.supabase.co/functions/v1/fetch-rss',
       headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
     );
     $$
   );
   ```

3. The Edge Function will fetch all feeds server-side and bypass Cloudflare

### Option 2: GitHub Actions Cron Job

1. Create `.github/workflows/fetch-rss.yml`:
   ```yaml
   name: Fetch RSS Feeds
   on:
     schedule:
       - cron: '0 * * * *'  # Every hour
   jobs:
     fetch:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - run: node scripts/fetch-rss.js
   ```

2. Create a Node.js script that fetches feeds and saves to Supabase

### Option 3: Vercel Cron Jobs

If you deploy to Vercel, you can use their cron jobs feature to run server-side RSS fetching.

---

## 🧪 Testing Feeds

To test if a feed will work:

1. **Try adding it** - The app will show a clear error if it's Cloudflare-protected
2. **Check the console** - Look for detailed error messages
3. **Use a different feed** - Try one from the "Works Well" list above

---

## 💡 Tips

### Finding RSS Feeds

Most websites have RSS feeds, but they're often hidden:

- Look for `/feed`, `/rss`, `/feed.xml`, `/rss.xml`
- Check the page source for `<link rel="alternate" type="application/rss+xml">`
- Use browser extensions like "RSS Feed Finder"

### Testing Feed URLs

Before adding to your app, test the URL in your browser:
- If it downloads an XML file → ✅ Will work
- If it shows Cloudflare challenge → ❌ Won't work (needs server-side)
- If it shows 404 → ❌ Invalid URL

---

## 🚀 Recommended Starter Feeds

Start with these reliable, high-quality feeds:

1. **Hacker News**: `https://hnrss.org/frontpage`
2. **TechCrunch**: `https://techcrunch.com/feed/`
3. **The Verge**: `https://www.theverge.com/rss/index.xml`
4. **Dev.to**: `https://dev.to/feed`
5. **GitHub Blog**: `https://github.blog/feed/`

These all work perfectly with browser-based fetching and provide great content!

