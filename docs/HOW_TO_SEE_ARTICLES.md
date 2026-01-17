# 📰 How to See Articles

Great! Your database is set up correctly. Now let's get some articles showing up.

## 🎯 Quick Test (30 seconds)

1. **Go to the Feeds page** in your app

2. **Add a test feed**:
   ```
   https://hnrss.org/frontpage
   ```

3. **Click "Add Feed"**

4. **Wait for the success messages**:
   - ✅ "Feed added! Fetching articles..."
   - ✅ "Successfully fetched X articles!"

5. **Go to the Articles page** (home page)

6. **You should now see articles!** 🎉

## 🔄 What Just Happened?

I've added automatic RSS feed fetching! When you add a feed, the app now:

1. ✅ Creates the feed record in the database
2. ✅ Fetches the RSS feed from the URL
3. ✅ Parses the XML to extract articles
4. ✅ Saves all articles to your database
5. ✅ Shows you how many articles were fetched

## 🔄 Refresh Button

Each feed now has a **refresh button** (circular arrow icon) that lets you:
- Manually fetch new articles from that feed
- Update existing articles
- See how many new articles were found

## 📋 Good RSS Feeds to Try

Here are some popular feeds that work well:

**Tech News:**
- Hacker News: `https://hnrss.org/frontpage`
- TechCrunch: `https://techcrunch.com/feed/`
- The Verge: `https://www.theverge.com/rss/index.xml`
- Ars Technica: `https://feeds.arstechnica.com/arstechnica/index`

**Development:**
- CSS Tricks: `https://css-tricks.com/feed/`
- Smashing Magazine: `https://www.smashingmagazine.com/feed/`
- Dev.to: `https://dev.to/feed`

**Reddit:**
- r/programming: `https://www.reddit.com/r/programming/.rss`
- r/webdev: `https://www.reddit.com/r/webdev/.rss`

**Blogs:**
- GitHub Blog: `https://github.blog/feed/`
- Netlify Blog: `https://www.netlify.com/blog/index.xml`

## ⚠️ Important Notes

### CORS Proxy (Development Only)
The current implementation uses a CORS proxy (`allorigins.win`) to fetch RSS feeds from the browser. This is fine for development but has limitations:

- ⚠️ Rate limits
- ⚠️ May be slow
- ⚠️ Not suitable for production

### For Production
You should implement server-side RSS fetching using:

1. **Supabase Edge Function** (recommended)
   - Create a scheduled function that runs every hour
   - Fetches all active feeds
   - Saves articles to database

2. **Cron Job**
   - Set up a Node.js script
   - Run it on a schedule (e.g., every 30 minutes)
   - Use a service like GitHub Actions or Vercel Cron

3. **Background Worker**
   - Deploy a separate service
   - Continuously monitors and fetches feeds
   - More reliable for high-volume usage

## 🐛 Troubleshooting

### "Failed to fetch articles from feed"
- The feed URL might be invalid
- The feed might not support CORS
- The feed might not be in RSS/Atom format
- Try a different feed from the list above

### Articles not showing up
- Check browser console for errors
- Make sure you're on the Articles page (home)
- Try refreshing the page
- Check that the feed status is "active" (green)

### Duplicate articles
- The app automatically prevents duplicates
- Same article URL from same feed = ignored
- This is by design!

## ✨ Features You Can Now Use

- ✅ **Read articles** - Click on any article to read
- ✅ **Mark as read** - Articles you've read are tracked
- ✅ **Save articles** - Bookmark important articles
- ✅ **Filter by feed** - See articles from specific sources
- ✅ **Search** - Find articles by keyword
- ✅ **Date range** - Filter by time period

## 🚀 Next Steps

1. **Add more feeds** - Build your personalized news aggregator
2. **Organize with categories** - Group related feeds together
3. **Export your feed** - Use with Zapier/IFTTT (Settings page)
4. **Set up Stripe** - Enable paid subscriptions (see STRIPE_SETUP.md)

Enjoy your RSS aggregator! 🎉

