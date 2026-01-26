import { supabase } from "./supabase"

interface RSSItem {
  title: string
  link: string
  description?: string
  pubDate?: string
  author?: string
  content?: string
  guid?: string
}

interface EdgeFunctionArticle {
  feed_id: string
  title: string
  url: string
  description: string | null
  published_at: string
  guid: string
}

interface DiscoveredFeed {
  url: string
  title?: string
  type: string
}

/**
 * Fetch RSS feed using server-side edge function (recommended for production)
 * This bypasses CORS and Cloudflare protection
 */
export async function fetchRSSFeedServerSide(feedUrl: string): Promise<RSSItem[]> {
  try {
    console.log(`Fetching RSS feed server-side: ${feedUrl}`)

    const { data, error } = await supabase.functions.invoke("fetch-rss", {
      body: { url: feedUrl },
    })

    if (error) throw error

    if (!data.success || !data.results || data.results.length === 0) {
      throw new Error("Failed to fetch feed from server")
    }

    const result = data.results[0]

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch feed")
    }

    // Convert edge function articles to RSSItem format
    const articles: EdgeFunctionArticle[] = result.articles || []
    return articles.map(article => ({
      title: article.title,
      link: article.url,
      description: article.description || undefined,
      pubDate: article.published_at,
      guid: article.guid,
    }))
  } catch (error) {
    console.error("Server-side RSS fetch failed:", error)
    throw error
  }
}

/**
 * Auto-discover RSS/Atom feeds from a website URL
 * Looks for <link> tags with rel="alternate" and type="application/rss+xml" or "application/atom+xml"
 */
export async function discoverRSSFeeds(websiteUrl: string): Promise<DiscoveredFeed[]> {
  try {
    console.log(`Discovering RSS feeds from: ${websiteUrl}`)

    // Ensure URL is valid
    const url = new URL(websiteUrl)

    // Always use CORS proxy to avoid CSP violations
    console.log("Using CORS proxy to fetch HTML...")
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(websiteUrl)}`
    const response = await fetch(proxyUrl)

    if (!response.ok) {
      throw new Error(`Proxy HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const htmlText = data.contents

    // Parse HTML to find RSS feed links
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlText, "text/html")

    const feeds: DiscoveredFeed[] = []

    // Look for RSS/Atom feed links in <link> tags
    const linkTags = doc.querySelectorAll('link[rel="alternate"]')

    linkTags.forEach(link => {
      const type = link.getAttribute("type")
      const href = link.getAttribute("href")
      const title = link.getAttribute("title")

      if (href && (type === "application/rss+xml" || type === "application/atom+xml" || type === "application/xml")) {
        // Resolve relative URLs
        const feedUrl = new URL(href, url.origin).href

        feeds.push({
          url: feedUrl,
          title: title || undefined,
          type: type,
        })
      }
    })

    // If no feeds found in <link> tags, try common RSS feed paths
    if (feeds.length === 0) {
      console.log("No feeds found in <link> tags, trying common paths...")
      const commonPaths = ["/feed", "/rss", "/feed.xml", "/rss.xml", "/atom.xml", "/index.xml", "/blog/feed", "/blog/rss"]

      for (const path of commonPaths) {
        const testUrl = new URL(path, url.origin).href
        try {
          // Test if the URL returns valid RSS/Atom
          const testResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(testUrl)}`)
          if (testResponse.ok) {
            const testData = await testResponse.json()
            const testDoc = parser.parseFromString(testData.contents, "text/xml")

            // Check if it's valid RSS/Atom
            if (testDoc.querySelector("rss, feed, rdf\\:RDF")) {
              feeds.push({
                url: testUrl,
                title: undefined,
                type: "application/rss+xml",
              })
              break // Found one, stop searching
            }
          }
        } catch (error) {
          // Continue to next path
          continue
        }
      }
    }

    console.log(`Found ${feeds.length} RSS feed(s)`)
    return feeds
  } catch (error) {
    console.error("Error discovering RSS feeds:", error)
    throw error
  }
}

/**
 * Fetch and parse RSS feed using a CORS proxy
 * Note: In production, this should be done server-side
 */
export async function fetchRSSFeed(feedUrl: string): Promise<RSSItem[]> {
  try {
    console.log(`Fetching RSS feed: ${feedUrl}`)

    // Always use CORS proxy to avoid CSP violations
    // Direct fetch would be blocked by Content Security Policy
    console.log("Using CORS proxy...")
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`

    const response = await fetch(proxyUrl)

    if (!response.ok) {
      throw new Error(`Proxy HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.contents) {
      throw new Error("Failed to fetch feed - no content returned from proxy")
    }

    let xmlText = data.contents

    console.log(`Received ${xmlText.length} bytes of content`)

    // Check if we got a base64-encoded data URL
    if (xmlText.startsWith("data:")) {
      console.log("Detected base64-encoded data URL, decoding...")
      const base64Match = xmlText.match(/^data:[^,]+,(.+)$/)
      if (base64Match) {
        const base64Data = base64Match[1]
        try {
          xmlText = atob(base64Data)
          console.log("Successfully decoded base64 content")
          console.log("Decoded preview:", xmlText.substring(0, 200))
        } catch (e) {
          console.error("Failed to decode base64:", e)
          throw new Error("Failed to decode base64-encoded feed")
        }
      } else {
        console.error("Could not extract base64 data from data URL")
        throw new Error("Invalid data URL format")
      }
    }

    // Check if we got a Cloudflare challenge page instead of RSS
    if (xmlText.includes("Enable JavaScript and cookies to continue") || xmlText.includes("__cf_chl_opt") || xmlText.includes("challenge-platform")) {
      throw new Error("Feed is protected by Cloudflare - cannot fetch from browser. This feed needs server-side fetching.")
    }

    // Check if we got HTML instead of XML
    if (xmlText.trim().startsWith("<!DOCTYPE html") || xmlText.trim().startsWith("<html")) {
      throw new Error("Received HTML instead of RSS feed - the URL may be incorrect or the feed may be protected")
    }

    // Log first 500 chars to debug
    console.log("Content preview:", xmlText.substring(0, 500))

    // Parse XML
    const parser = new DOMParser()
    const xml = parser.parseFromString(xmlText, "text/xml")

    // Check for parsing errors (but be lenient)
    const parseError = xml.querySelector("parsererror")
    if (parseError) {
      console.warn("XML parsing warning:", parseError.textContent)
      // Don't throw immediately - try to parse anyway
    }

    // Try RSS 2.0 format first
    let items = xml.querySelectorAll("item")
    let isAtom = false

    // If no items, try Atom format
    if (items.length === 0) {
      items = xml.querySelectorAll("entry")
      isAtom = true
    }

    // If still no items, check if it's a valid feed at all
    if (items.length === 0) {
      const hasRss = xml.querySelector("rss") || xml.querySelector("feed")
      if (!hasRss) {
        // Log the XML structure to help debug
        console.error("XML root element:", xml.documentElement?.tagName)
        console.error("XML content:", new XMLSerializer().serializeToString(xml).substring(0, 1000))
        throw new Error("Not a valid RSS or Atom feed - no <rss> or <feed> element found")
      }
      // Empty feed is OK
      console.warn("Feed is valid but contains no items")
      return []
    }

    const articles: RSSItem[] = []

    items.forEach(item => {
      try {
        // Get title
        const title = item.querySelector("title")?.textContent?.trim() || "Untitled"

        // Get link (different for RSS vs Atom)
        let link = ""
        if (isAtom) {
          // Atom feeds use <link href="...">
          const linkEl = item.querySelector("link")
          link = linkEl?.getAttribute("href") || linkEl?.textContent?.trim() || ""
        } else {
          // RSS feeds use <link>url</link>
          link = item.querySelector("link")?.textContent?.trim() || ""
        }

        // Skip items without a link
        if (!link) {
          console.warn("Skipping item without link:", title)
          return
        }

        // Get description/summary
        const description = item.querySelector("description")?.textContent?.trim() || item.querySelector("summary")?.textContent?.trim() || ""

        // Get publication date
        const pubDate =
          item.querySelector("pubDate")?.textContent?.trim() ||
          item.querySelector("published")?.textContent?.trim() ||
          item.querySelector("updated")?.textContent?.trim() ||
          ""

        // Get author
        const authorEl = item.querySelector("author")
        const author =
          authorEl?.querySelector("name")?.textContent?.trim() ||
          authorEl?.textContent?.trim() ||
          item.querySelector("dc\\:creator")?.textContent?.trim() ||
          item.querySelector("creator")?.textContent?.trim() ||
          ""

        // Get content (prefer full content over description)
        const content =
          item.querySelector("content\\:encoded")?.textContent?.trim() || item.querySelector("content")?.textContent?.trim() || description

        // Get guid (unique identifier)
        const guid = item.querySelector("guid")?.textContent?.trim() || item.querySelector("id")?.textContent?.trim() || link

        articles.push({
          title,
          link,
          description,
          pubDate,
          author,
          content,
          guid,
        })
      } catch (itemError) {
        console.warn("Error parsing feed item:", itemError)
        // Continue with next item
      }
    })

    if (articles.length === 0) {
      console.warn("No valid articles found in feed")
    }

    return articles
  } catch (error) {
    console.error("Error fetching RSS feed:", error)
    throw error
  }
}

/**
 * Fetch RSS feed and save articles to database using server-side edge function
 */
export async function fetchAndSaveArticles(feedId: string, feedUrl: string): Promise<number> {
  try {
    console.log(`Fetching RSS feed server-side: ${feedUrl}`)

    // Use edge function to fetch feed server-side (bypasses CORS and Cloudflare)
    const { data, error } = await supabase.functions.invoke("fetch-rss", {
      body: { feedId },
    })

    if (error) {
      console.error("Edge function error:", error)
      throw new Error(error.message || "Failed to fetch feed from server")
    }

    if (!data.success || !data.results || data.results.length === 0) {
      throw new Error("Failed to fetch feed from server")
    }

    const result = data.results[0]

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch feed")
    }

    console.log(`Successfully fetched ${result.articlesCount} articles from server`)
    return result.articlesCount || 0
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch feed"
    console.error(`Error fetching feed ${feedId}:`, errorMessage)
    throw error
  }
}

/**
 * Fetch RSS feed and save articles to database (client-side fallback - deprecated)
 * @deprecated Use fetchAndSaveArticles instead which uses server-side fetching
 */
export async function fetchAndSaveArticlesClientSide(feedId: string, feedUrl: string): Promise<number> {
  try {
    console.log(`Fetching RSS feed client-side: ${feedUrl}`)
    const items = await fetchRSSFeed(feedUrl)

    console.log(`Found ${items.length} items in feed`)

    if (items.length === 0) {
      // Update feed status even if no articles
      await supabase
        .from("feeds")
        .update({
          last_fetched: new Date().toISOString(),
          status: "active",
          error_message: null,
        })
        .eq("id", feedId)

      return 0
    }

    // Prepare articles for insertion
    const articles = items.map(item => ({
      feed_id: feedId,
      title: item.title,
      url: item.link,
      description: item.description || null,
      content: item.content !== item.description ? item.content : null, // Only save content if it's different from description
      author: item.author || null,
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      guid: item.guid || item.link, // Use guid or fallback to link
    }))

    console.log(`Saving ${articles.length} articles to database...`)

    // Insert articles (ignore duplicates)
    const { data, error } = await supabase
      .from("articles")
      .upsert(articles, {
        onConflict: "feed_id,url",
        ignoreDuplicates: true,
      })
      .select()

    if (error) {
      console.error("Error saving articles:", error)
      throw new Error(`Failed to save articles: ${error.message}`)
    }

    console.log(`Successfully saved ${data?.length || 0} new articles`)

    // Update feed's last_fetched timestamp
    await supabase
      .from("feeds")
      .update({
        last_fetched: new Date().toISOString(),
        status: "active",
        error_message: null,
      })
      .eq("id", feedId)

    return data?.length || 0
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch feed"
    console.error(`Error fetching feed ${feedId}:`, errorMessage)

    // Update feed with error status
    await supabase
      .from("feeds")
      .update({
        status: "error",
        error_message: errorMessage,
      })
      .eq("id", feedId)

    throw error
  }
}

/**
 * Refresh all active feeds for the current user
 */
export async function refreshAllFeeds(): Promise<{ success: number; failed: number }> {
  const { data: feeds, error } = await supabase.from("feeds").select("id, url").eq("status", "active")

  if (error || !feeds) {
    throw new Error("Failed to fetch feeds")
  }

  let success = 0
  let failed = 0

  for (const feed of feeds) {
    try {
      await fetchAndSaveArticles(feed.id, feed.url)
      success++
    } catch (error) {
      console.error(`Failed to refresh feed ${feed.id}:`, error)
      failed++
    }
  }

  return { success, failed }
}
