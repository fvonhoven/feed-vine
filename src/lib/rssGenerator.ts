import type { ArticleWithFeed } from "../types/database"

export function generateRSSFeed(articles: ArticleWithFeed[], userEmail: string, baseUrl?: string): string {
  const now = new Date().toUTCString()
  const siteUrl = baseUrl || window.location.origin
  const feedUrl = `${siteUrl}/api/feed.xml`

  const items = articles
    .slice(0, 50) // Limit to 50 most recent articles
    .map(article => {
      const pubDate = new Date(article.published_at).toUTCString()
      const description = article.description || ""

      return `    <item>
      <title><![CDATA[${escapeXml(article.title)}]]></title>
      <link>${escapeXml(article.url)}</link>
      <guid isPermaLink="true">${escapeXml(article.url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeXml(description)}]]></description>
      <source url="${escapeXml(article.feed.url)}">${escapeXml(article.feed.title)}</source>
    </item>`
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>RSS Aggregator - ${escapeXml(userEmail)}</title>
    <link>${siteUrl}</link>
    <description>Aggregated RSS feed from multiple sources</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}

export function downloadRSSFeed(articles: ArticleWithFeed[], userEmail: string) {
  const rssContent = generateRSSFeed(articles, userEmail)

  const blob = new Blob([rssContent], { type: "application/rss+xml" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `rss-aggregator-${new Date().toISOString().split("T")[0]}.xml`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function copyRSSFeedURL(userEmail: string) {
  // In a real app, this would be a unique URL per user
  // For now, we'll generate a shareable URL format
  const baseUrl = window.location.origin
  const encodedEmail = encodeURIComponent(userEmail)
  const feedUrl = `${baseUrl}/api/feed/${encodedEmail}.xml`

  navigator.clipboard.writeText(feedUrl)
  return feedUrl
}
