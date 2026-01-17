export interface PopularFeed {
  title: string
  url: string
  description: string
  category: string
  icon?: string
}

export const popularFeeds: PopularFeed[] = [
  // AI & Machine Learning
  {
    title: "OpenAI Blog",
    url: "https://openai.com/blog/rss/",
    description: "Latest updates from OpenAI on AI research and products (Note: May not work due to Cloudflare protection)",
    category: "AI & ML",
  },
  {
    title: "Google Research Blog",
    url: "https://research.google/blog/feed/",
    description: "Research and news from Google Research",
    category: "AI & ML",
  },
  {
    title: "DeepMind Blog",
    url: "https://deepmind.google/blog/rss.xml",
    description: "Breakthroughs in AI research from DeepMind",
    category: "AI & ML",
  },
  {
    title: "Anthropic News",
    url: "https://www.anthropic.com/news/rss.xml",
    description: "Updates from Anthropic on AI safety and research",
    category: "AI & ML",
  },

  // Tech News
  {
    title: "Hacker News",
    url: "https://hnrss.org/frontpage",
    description: "Top stories from Hacker News",
    category: "Tech News",
  },
  {
    title: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    description: "Latest technology news and startup coverage",
    category: "Tech News",
  },
  {
    title: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    description: "Technology, science, art, and culture news",
    category: "Tech News",
  },
  {
    title: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    description: "In-depth technology news and analysis",
    category: "Tech News",
  },
  {
    title: "Wired",
    url: "https://www.wired.com/feed/rss",
    description: "Technology, business, and culture news",
    category: "Tech News",
  },

  // Startups & Business
  {
    title: "Y Combinator",
    url: "https://www.ycombinator.com/blog/feed",
    description: "Startup advice and news from Y Combinator",
    category: "Startups",
  },
  {
    title: "First Round Review",
    url: "https://review.firstround.com/feed",
    description: "Tactical advice for startup founders",
    category: "Startups",
  },
  {
    title: "a16z",
    url: "https://a16z.com/feed/",
    description: "Insights from Andreessen Horowitz",
    category: "Startups",
  },
  {
    title: "Paul Graham Essays",
    url: "http://www.aaronsw.com/2002/feeds/pgessays.rss",
    description: "Essays on startups and technology",
    category: "Startups",
  },

  // Development
  {
    title: "GitHub Blog",
    url: "https://github.blog/feed/",
    description: "Updates and news from GitHub",
    category: "Development",
  },
  {
    title: "CSS-Tricks",
    url: "https://css-tricks.com/feed/",
    description: "Web development tips and tutorials",
    category: "Development",
  },
  {
    title: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/feed/",
    description: "Web design and development articles",
    category: "Development",
  },
  {
    title: "Dev.to",
    url: "https://dev.to/feed",
    description: "Community of software developers",
    category: "Development",
  },

  // Design
  {
    title: "Dribbble",
    url: "https://dribbble.com/shots/popular.rss",
    description: "Popular design shots from Dribbble",
    category: "Design",
  },
  {
    title: "Awwwards Blog",
    url: "https://www.awwwards.com/blog/feed/",
    description: "Web design inspiration and awards",
    category: "Design",
  },
  {
    title: "UX Collective",
    url: "https://uxdesign.cc/feed",
    description: "UX design articles and insights",
    category: "Design",
  },

  // Product Management
  {
    title: "Product Hunt",
    url: "https://www.producthunt.com/feed",
    description: "Latest product launches",
    category: "Product",
  },
  {
    title: "Mind the Product",
    url: "https://www.mindtheproduct.com/feed/",
    description: "Product management insights",
    category: "Product",
  },
  {
    title: "Lenny's Newsletter",
    url: "https://www.lennysnewsletter.com/feed",
    description: "Product and growth advice",
    category: "Product",
  },
]

export const feedCategories = Array.from(new Set(popularFeeds.map(feed => feed.category)))
