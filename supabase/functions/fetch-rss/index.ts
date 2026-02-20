import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { parseFeed } from "https://deno.land/x/rss@0.5.6/mod.ts"
// Webhook utilities are dynamically imported to prevent breaking feed fetching if there's an issue
// import { getWebhooksForEvent, fireWebhook, WebhookPayload } from "../_shared/webhooks.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface Feed {
  id: string
  url: string
  title: string
}

/**
 * Batch categorize multiple articles using Claude API
 * Returns a map of article index to category
 */
async function batchCategorizeArticles(articles: Array<{ title: string; description: string | null }>): Promise<string[]> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")

  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set, defaulting all to Uncategorized")
    return articles.map(() => "Uncategorized")
  }

  if (articles.length === 0) {
    return []
  }

  try {
    // Build a prompt with all articles
    const articlesList = articles
      .map((article, idx) => `${idx + 1}. Title: ${article.title}\n   Description: ${article.description || "No description"}`)
      .join("\n\n")

    const prompt = `Categorize each of these articles into ONE of these categories: AI News, Tools, Opinion, Startups, Backend, Tutorial, Research, Uncategorized

${articlesList}

Return ONLY a comma-separated list of categories in the same order as the articles, nothing else.
Example response: AI News, Tools, Opinion, Uncategorized`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022", // Use Haiku for fast, cheap batch categorization
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Claude API error:", error)
      return articles.map(() => "Uncategorized")
    }

    const data = await response.json()
    const categoriesText = data.content?.[0]?.text?.trim() || ""

    // Parse the comma-separated categories
    const categories = categoriesText.split(",").map(c => c.trim())

    // Validate and map categories
    const validCategories = ["AI News", "Tools", "Opinion", "Startups", "Backend", "Tutorial", "Research", "Uncategorized"]
    const result = categories.map((category, idx) => {
      if (validCategories.includes(category)) {
        return category
      }
      console.warn(`Invalid category for article ${idx + 1}: ${category}, defaulting to Uncategorized`)
      return "Uncategorized"
    })

    // If we got fewer categories than articles, fill the rest with Uncategorized
    while (result.length < articles.length) {
      result.push("Uncategorized")
    }

    return result.slice(0, articles.length)
  } catch (error) {
    console.error("Error calling Claude API:", error)
    return articles.map(() => "Uncategorized")
  }
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

    // Check if this is a request for a specific feed
    const url = new URL(req.url)
    let feedId = url.searchParams.get("feedId")
    let feedUrl = url.searchParams.get("url")

    // Also check POST body for parameters
    if (req.method === "POST") {
      try {
        const body = await req.json()
        feedId = body.feedId || feedId
        feedUrl = body.url || feedUrl
      } catch {
        // Ignore JSON parse errors, use query params
      }
    }

    let feeds: Feed[] = []

    if (feedId) {
      // Fetch specific feed by ID
      const { data, error } = await supabaseClient.from("feeds").select("id, url, title").eq("id", feedId).single()
      if (error) throw error
      feeds = [data]
    } else if (feedUrl) {
      // Fetch from a URL directly (for discovery/testing)
      feeds = [{ id: "temp", url: feedUrl, title: "Temporary Feed" }]
    } else {
      // Get all active feeds (cron job mode)
      const { data, error: feedsError } = await supabaseClient.from("feeds").select("id, url, title").eq("status", "active")
      if (feedsError) throw feedsError
      feeds = data as Feed[]
    }

    const results = []

    // Process each feed
    for (const feed of feeds as Feed[]) {
      try {
        console.log(`Fetching feed: ${feed.url}`)

        // Fetch RSS feed
        const response = await fetch(feed.url, {
          headers: {
            "User-Agent": "RSS-Aggregator/1.0",
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const contentType = response.headers.get("content-type") || ""
        const xml = await response.text()

        // Check if we got HTML instead of XML
        if (contentType.includes("text/html") || xml.trim().startsWith("<!DOCTYPE html") || xml.trim().startsWith("<html")) {
          throw new Error("Feed URL returned HTML instead of RSS/XML. The URL may be incorrect or the feed may not exist.")
        }

        // Check for Cloudflare challenge
        if (xml.includes("Enable JavaScript and cookies to continue") || xml.includes("__cf_chl_opt")) {
          throw new Error("Feed is protected by Cloudflare. Please contact support.")
        }

        const parsedFeed = await parseFeed(xml)

        // Update feed title if different
        if (parsedFeed.title && parsedFeed.title.value !== feed.title) {
          await supabaseClient.from("feeds").update({ title: parsedFeed.title.value }).eq("id", feed.id)
        }

        // Insert articles
        const articles = parsedFeed.entries.map((entry: any) => ({
          feed_id: feed.id,
          title: entry.title?.value || "Untitled",
          url: entry.links?.[0]?.href || entry.id?.value || "",
          description: entry.description?.value || entry.content?.value || null,
          published_at: entry.published || entry.updated || new Date().toISOString(),
          guid: entry.id?.value || entry.links?.[0]?.href || "",
        }))

        // Track insert counts
        let insertedCount = 0
        let skippedCount = 0
        let errorCount = 0
        let lastError: any = null
        const insertedArticles: Array<{ title: string; url: string; description: string | null; category: string }> = []

        // Only insert articles if this is a real feed (not a temporary URL fetch)
        if (feed.id !== "temp") {
          // Batch categorize all articles at once (much faster!)
          console.log(`Batch categorizing ${articles.length} articles...`)
          let categories: string[] = []
          try {
            categories = await batchCategorizeArticles(articles)
            console.log(`Batch categorization complete:`, categories)
          } catch (catError) {
            console.warn(`Failed to batch categorize articles, using defaults:`, catError)
            categories = articles.map(() => "Uncategorized")
          }

          // Insert articles one by one to handle duplicates gracefully
          for (let i = 0; i < articles.length; i++) {
            const article = articles[i]
            const category = categories[i] || "Uncategorized"

            // Insert article with category
            const { error: insertError } = await supabaseClient.from("articles").insert({
              ...article,
              category,
            })

            if (insertError) {
              if (insertError.code === "23505") {
                // Duplicate key - this is expected for existing articles
                skippedCount++
              } else {
                console.error(`Error inserting article:`, insertError.message)
                lastError = insertError
                errorCount++
              }
            } else {
              insertedCount++
              insertedArticles.push({ ...article, category })
              console.log(`Inserted "${article.title}" as: ${category}`)
            }
          }

          console.log(`Feed ${feed.id}: Inserted ${insertedCount}, skipped ${skippedCount}, errors ${errorCount}`)

          // Fire webhooks for new articles (dynamic import to avoid breaking feed fetching)
          if (insertedArticles.length > 0) {
            try {
              const { getWebhooksForEvent, fireWebhook } = await import("../_shared/webhooks.ts")
              const webhooks = await getWebhooksForEvent(supabaseClient, "new_article", { feedId: feed.id })
              console.log(`Found ${webhooks.length} webhooks to fire for feed ${feed.id}`)

              for (const webhook of webhooks) {
                const payload = {
                  event: "new_article",
                  timestamp: new Date().toISOString(),
                  data: {
                    feed: {
                      id: feed.id,
                      title: feed.title,
                      url: feed.url,
                    },
                    articles: insertedArticles.map(a => ({
                      title: a.title,
                      url: a.url,
                      description: a.description,
                      category: a.category,
                    })),
                    count: insertedArticles.length,
                  },
                }

                // Fire webhook asynchronously (don't wait)
                fireWebhook(supabaseClient, webhook, payload)
                  .then(result => {
                    if (result.success) {
                      console.log(`Webhook ${webhook.id} fired successfully`)
                    } else {
                      console.error(`Webhook ${webhook.id} failed:`, result.error)
                    }
                  })
                  .catch(err => console.error(`Webhook ${webhook.id} error:`, err))
              }
            } catch (webhookError) {
              console.error("Error firing webhooks:", webhookError)
              // Don't fail the whole operation if webhooks fail
            }
          }

          // Update feed status
          await supabaseClient
            .from("feeds")
            .update({
              last_fetched: new Date().toISOString(),
              status: "active",
              error_message: null,
            })
            .eq("id", feed.id)
        }

        results.push({
          feedId: feed.id,
          success: true,
          articlesCount: articles.length,
          insertedCount,
          skippedCount,
          errorCount,
          lastError: lastError ? { message: lastError.message, code: lastError.code, details: lastError.details } : null,
          feedTitle: parsedFeed.title?.value || feed.title,
          articles: feedUrl ? articles : undefined, // Return articles only for direct URL fetches
        })
      } catch (error) {
        console.error(`Error processing feed ${feed.id}:`, error)

        // Update feed with error status (only for real feeds)
        if (feed.id !== "temp") {
          await supabaseClient
            .from("feeds")
            .update({
              status: "error",
              error_message: error.message,
            })
            .eq("id", feed.id)
        }

        results.push({
          feedId: feed.id,
          success: false,
          error: error.message,
        })
      }
    }

    // Ping CronNarc to report successful execution
    const cronNarcUrl = Deno.env.get("CRONNARC_PING_URL")
    if (cronNarcUrl) {
      try {
        await fetch(cronNarcUrl, { method: "GET" })
        console.log("Successfully pinged CronNarc")
      } catch (error) {
        console.error("Failed to ping CronNarc:", error)
        // Don't fail the whole function if CronNarc ping fails
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
