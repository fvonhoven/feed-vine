# Test RSS Feeds

Use these RSS feeds to test your aggregator:

## Tech News

### General Tech
- **Hacker News**: `https://hnrss.org/frontpage`
- **TechCrunch**: `https://techcrunch.com/feed/`
- **The Verge**: `https://www.theverge.com/rss/index.xml`
- **Ars Technica**: `https://feeds.arstechnica.com/arstechnica/index`
- **Wired**: `https://www.wired.com/feed/rss`

### AI & Machine Learning
- **OpenAI Blog**: `https://openai.com/blog/rss.xml`
- **Google AI Blog**: `https://ai.googleblog.com/feeds/posts/default`
- **Anthropic News**: `https://www.anthropic.com/news/rss.xml`
- **Hugging Face Blog**: `https://huggingface.co/blog/feed.xml`

### Developer News
- **GitHub Blog**: `https://github.blog/feed/`
- **Dev.to**: `https://dev.to/feed`
- **CSS-Tricks**: `https://css-tricks.com/feed/`
- **Smashing Magazine**: `https://www.smashingmagazine.com/feed/`

### Startups & Business
- **Y Combinator**: `https://www.ycombinator.com/blog/feed`
- **Product Hunt**: `https://www.producthunt.com/feed`
- **Indie Hackers**: `https://www.indiehackers.com/feed`

## How to Add Feeds

1. Go to the "Feeds" page
2. Paste any URL from above into the input field
3. Click "Add Feed"
4. Trigger the RSS fetch function (see SETUP_GUIDE.md)
5. Go back to home page to see articles

## Manual Fetch Command

```bash
curl -X POST 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/fetch-rss' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Replace `YOUR-PROJECT-REF` and `YOUR_ANON_KEY` with your actual Supabase credentials.

