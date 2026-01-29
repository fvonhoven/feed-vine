export interface PopularFeed {
  title: string
  url: string
  websiteUrl: string
  description: string
  category: string
  icon?: string
}

export const popularFeeds: PopularFeed[] = [
  // AI & Machine Learning
  {
    title: "OpenAI Blog",
    url: "https://openai.com/blog/rss/",
    websiteUrl: "https://openai.com/blog/",
    description: "Latest updates from OpenAI on AI research and products (Note: May not work due to Cloudflare protection)",
    category: "AI & ML",
  },
  {
    title: "Google Research Blog",
    url: "https://research.google/blog/feed/",
    websiteUrl: "https://research.google/blog/",
    description: "Research and news from Google Research",
    category: "AI & ML",
  },
  {
    title: "DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    websiteUrl: "https://deepmind.google/blog/",
    description: "Breakthroughs in AI research from DeepMind",
    category: "AI & ML",
  },
  {
    title: "Anthropic News",
    url: "https://www.anthropic.com/news/rss.xml",
    websiteUrl: "https://www.anthropic.com/news",
    description: "Updates from Anthropic on AI safety and research",
    category: "AI & ML",
  },

  // Tech News
  {
    title: "Hacker News",
    url: "https://hnrss.org/frontpage",
    websiteUrl: "https://news.ycombinator.com/",
    description: "Top stories from Hacker News",
    category: "Tech News",
  },
  {
    title: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    websiteUrl: "https://techcrunch.com/",
    description: "Latest technology news and startup coverage",
    category: "Tech News",
  },
  {
    title: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    websiteUrl: "https://www.theverge.com/",
    description: "Technology, science, art, and culture news",
    category: "Tech News",
  },
  {
    title: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    websiteUrl: "https://arstechnica.com/",
    description: "In-depth technology news and analysis",
    category: "Tech News",
  },
  {
    title: "Wired",
    url: "https://www.wired.com/feed/rss",
    websiteUrl: "https://www.wired.com/",
    description: "Technology, business, and culture news",
    category: "Tech News",
  },

  // Startups & Business
  {
    title: "Y Combinator",
    url: "https://www.ycombinator.com/blog/feed",
    websiteUrl: "https://www.ycombinator.com/blog",
    description: "Startup advice and news from Y Combinator",
    category: "Startups",
  },
  {
    title: "First Round Review",
    url: "https://review.firstround.com/feed",
    websiteUrl: "https://review.firstround.com/",
    description: "Tactical advice for startup founders",
    category: "Startups",
  },
  {
    title: "a16z",
    url: "https://a16z.com/feed/",
    websiteUrl: "https://a16z.com/",
    description: "Insights from Andreessen Horowitz",
    category: "Startups",
  },
  {
    title: "Paul Graham Essays",
    url: "http://www.aaronsw.com/2002/feeds/pgessays.rss",
    websiteUrl: "http://www.paulgraham.com/articles.html",
    description: "Essays on startups and technology",
    category: "Startups",
  },

  // Development
  {
    title: "GitHub Blog",
    url: "https://github.blog/feed/",
    websiteUrl: "https://github.blog/",
    description: "Updates and news from GitHub",
    category: "Development",
  },
  {
    title: "CSS-Tricks",
    url: "https://css-tricks.com/feed/",
    websiteUrl: "https://css-tricks.com/",
    description: "Web development tips and tutorials",
    category: "Development",
  },
  {
    title: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/feed/",
    websiteUrl: "https://www.smashingmagazine.com/",
    description: "Web design and development articles",
    category: "Development",
  },
  {
    title: "Dev.to",
    url: "https://dev.to/feed",
    websiteUrl: "https://dev.to/",
    description: "Community of software developers",
    category: "Development",
  },

  // Design
  {
    title: "Dribbble",
    url: "https://dribbble.com/shots/popular.rss",
    websiteUrl: "https://dribbble.com/",
    description: "Popular design shots from Dribbble",
    category: "Design",
  },
  {
    title: "Awwwards Blog",
    url: "https://www.awwwards.com/blog/feed/",
    websiteUrl: "https://www.awwwards.com/blog/",
    description: "Web design inspiration and awards",
    category: "Design",
  },
  {
    title: "UX Collective",
    url: "https://uxdesign.cc/feed",
    websiteUrl: "https://uxdesign.cc/",
    description: "UX design articles and insights",
    category: "Design",
  },

  // Product Management
  {
    title: "Product Hunt",
    url: "https://www.producthunt.com/feed",
    websiteUrl: "https://www.producthunt.com/",
    description: "Latest product launches",
    category: "Product",
  },
  {
    title: "Mind the Product",
    url: "https://www.mindtheproduct.com/feed/",
    websiteUrl: "https://www.mindtheproduct.com/",
    description: "Product management insights",
    category: "Product",
  },
  {
    title: "Lenny's Newsletter",
    url: "https://www.lennysnewsletter.com/feed",
    websiteUrl: "https://www.lennysnewsletter.com/",
    description: "Product and growth advice",
    category: "Product",
  },
]

export const feedCategories = Array.from(new Set(popularFeeds.map(feed => feed.category)))
