import type { Feed, ArticleWithFeed, Category, ArticleWithStatus } from "../types/database"

export const mockCategories: Category[] = [
  {
    id: "cat-1",
    user_id: "demo-user",
    name: "Tech News",
    color: "#3B82F6",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: "cat-2",
    user_id: "demo-user",
    name: "AI & ML",
    color: "#8B5CF6",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
  },
  {
    id: "cat-3",
    user_id: "demo-user",
    name: "Startups",
    color: "#10B981",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
  },
]

export const mockFeeds: Feed[] = [
  {
    id: "1",
    user_id: "demo-user",
    category_id: "cat-1",
    url: "https://hnrss.org/frontpage",
    title: "Hacker News",
    last_fetched: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    status: "active",
    error_message: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
  },
  {
    id: "2",
    user_id: "demo-user",
    category_id: "cat-1",
    url: "https://techcrunch.com/feed/",
    title: "TechCrunch",
    last_fetched: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    status: "active",
    error_message: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
  },
  {
    id: "3",
    user_id: "demo-user",
    category_id: "cat-1",
    url: "https://www.theverge.com/rss/index.xml",
    title: "The Verge",
    last_fetched: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 mins ago
    status: "active",
    error_message: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
  },
]

export const mockArticles: ArticleWithFeed[] = [
  {
    id: "1",
    feed_id: "1",
    title: "Show HN: I built an RSS aggregator with AI summarization",
    url: "https://example.com/article1",
    description:
      "A modern RSS feed aggregator that uses AI to summarize articles and help you stay on top of tech news without information overload.",
    content: null,
    author: "techbuilder",
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    guid: "hn-1",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    feed: {
      title: "Hacker News",
      url: "https://hnrss.org/frontpage",
    },
  },
  {
    id: "2",
    feed_id: "2",
    title: "OpenAI announces GPT-5 with breakthrough reasoning capabilities",
    url: "https://example.com/article2",
    description:
      "The latest iteration of GPT shows significant improvements in logical reasoning, mathematics, and code generation, marking a major leap forward in AI capabilities.",
    content: null,
    author: "Sarah Chen",
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    guid: "tc-1",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    feed: {
      title: "TechCrunch",
      url: "https://techcrunch.com/feed/",
    },
  },
  {
    id: "3",
    feed_id: "3",
    title: "The future of web development: React Server Components explained",
    url: "https://example.com/article3",
    description:
      "A deep dive into React Server Components and how they're changing the way we build modern web applications with better performance and user experience.",
    content: null,
    author: "Dan Abramov",
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    guid: "verge-1",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    feed: {
      title: "The Verge",
      url: "https://www.theverge.com/rss/index.xml",
    },
  },
  {
    id: "4",
    feed_id: "1",
    title: "Ask HN: What are your favorite productivity tools in 2026?",
    url: "https://example.com/article4",
    description:
      "Community discussion about the best productivity tools, apps, and workflows that help developers and knowledge workers stay focused and efficient.",
    content: null,
    author: null,
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    guid: "hn-2",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    feed: {
      title: "Hacker News",
      url: "https://hnrss.org/frontpage",
    },
  },
  {
    id: "5",
    feed_id: "2",
    title: "Startup raises $50M to revolutionize developer tools with AI",
    url: "https://example.com/article5",
    description:
      "A new startup is using AI to help developers write better code faster, with features like intelligent code completion, bug detection, and automated refactoring.",
    content: null,
    author: "Mike Isaac",
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    guid: "tc-2",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    feed: {
      title: "TechCrunch",
      url: "https://techcrunch.com/feed/",
    },
  },
  {
    id: "6",
    feed_id: "3",
    title: "Apple announces new MacBook Pro with M4 chip",
    url: "https://example.com/article6",
    description:
      "The latest MacBook Pro features the M4 chip with unprecedented performance for creative professionals and developers, along with improved battery life.",
    content: null,
    author: "Dieter Bohn",
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    guid: "verge-2",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    feed: {
      title: "The Verge",
      url: "https://www.theverge.com/rss/index.xml",
    },
  },
  {
    id: "7",
    feed_id: "1",
    title: "The state of JavaScript frameworks in 2026",
    url: "https://example.com/article7",
    description:
      "An analysis of the current JavaScript framework landscape, including React, Vue, Svelte, and emerging alternatives that are gaining traction.",
    content: null,
    author: null,
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    guid: "hn-3",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    feed: {
      title: "Hacker News",
      url: "https://hnrss.org/frontpage",
    },
  },
  {
    id: "8",
    feed_id: "2",
    title: "How AI is transforming software development workflows",
    url: "https://example.com/article8",
    description:
      "From code generation to automated testing, AI is changing every aspect of how software is built, deployed, and maintained in modern development teams.",
    content: null,
    author: "Josh Constine",
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
    guid: "tc-3",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    feed: {
      title: "TechCrunch",
      url: "https://techcrunch.com/feed/",
    },
  },
]

// Articles with read/saved status (Feedly-like)
export const mockArticlesWithStatus: ArticleWithStatus[] = mockArticles.map((article, index) => ({
  ...article,
  user_article:
    index < 3
      ? {
          is_read: true,
          is_saved: index === 1, // Second article is saved
        }
      : index === 5
      ? {
          is_read: false,
          is_saved: true, // Sixth article is saved but unread
        }
      : null,
}))

// Demo user for mock authentication
export const mockUser = {
  id: "demo-user",
  email: "demo@example.com",
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  role: "authenticated",
}
