import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { parseFeed } from "https://deno.land/x/rss@0.5.6/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface Feed {
  id: string
  url: string
  title: string
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

        // Only insert articles if this is a real feed (not a temporary URL fetch)
        if (feed.id !== "temp") {
          // Upsert articles (insert or ignore duplicates)
          const { error: articlesError } = await supabaseClient.from("articles").upsert(articles, { onConflict: "url", ignoreDuplicates: true })

          if (articlesError && !articlesError.message.includes("duplicate")) {
            console.error(`Error inserting articles for feed ${feed.id}:`, articlesError)
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
