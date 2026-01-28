import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface Article {
  id: string
  title: string
  url: string
  description: string | null
  content: string | null
  category: string | null
  published_at: string
  feed: {
    title: string
    url: string
  }
}

function generateRSS(articles: Article[], collectionName: string, collectionDescription: string, baseUrl: string): string {
  const now = new Date().toUTCString()

  const items = articles
    .map(
      article => `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${article.url}</link>
      <guid isPermaLink="true">${article.url}</guid>
      <pubDate>${new Date(article.published_at).toUTCString()}</pubDate>
      <description><![CDATA[${article.description || article.content || ""}]]></description>${article.category ? `\n      <category>${article.category}</category>` : ""}
      <source url="${article.feed.url}">${article.feed.title}</source>
    </item>
  `,
    )
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${collectionName}</title>
    <link>${baseUrl}</link>
    <description>${collectionDescription || "Aggregated RSS feed"}</description>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`
}

function generateJSON(articles: Article[], collectionName: string, collectionDescription: string): object {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: collectionName,
    description: collectionDescription || "Aggregated feed",
    home_page_url: "https://your-app.com",
    items: articles.map(article => ({
      id: article.url,
      url: article.url,
      title: article.title,
      content_html: article.description || article.content || "",
      summary: article.description || "",
      date_published: article.published_at,
      tags: article.category ? [article.category] : [],
      _source: {
        title: article.feed.title,
        url: article.feed.url,
      },
    })),
  }
}

serve(async req => {
  console.log("=== serve-collection called ===")
  console.log("Method:", req.method)
  console.log("URL:", req.url)

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request")
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split("/")
    const slug = pathParts[pathParts.length - 1].replace(/\.(rss|json)$/, "")
    const format = pathParts[pathParts.length - 1].endsWith(".json") ? "json" : "rss"

    console.log("Serving collection:", slug, "format:", format)

    if (!slug) {
      console.log("ERROR: Missing slug")
      return new Response("Missing collection slug", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      })
    }

    // Use service role key to bypass RLS for public collections
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

    // Get the collection (bypass RLS for public collections)
    console.log("Querying for collection with slug:", slug)
    const { data: collection, error: collectionError } = await supabaseClient
      .from("feed_collections")
      .select("id, name, description, user_id, is_public")
      .eq("slug", slug)
      .eq("is_public", true) // Only allow public collections
      .single()

    console.log("Collection query result:", { collection, error: collectionError })

    if (collectionError || !collection) {
      console.log("ERROR: Collection not found or not public")
      return new Response(
        JSON.stringify({
          error: "Collection not found or not public",
          slug: slug,
          details: collectionError?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Get feed IDs in this collection
    console.log("Fetching sources for collection:", collection.id)
    const { data: sources, error: sourcesError } = await supabaseClient
      .from("feed_collection_sources")
      .select("feed_id")
      .eq("collection_id", collection.id)

    console.log("Sources query result:", { sources, error: sourcesError })

    if (sourcesError || !sources || sources.length === 0) {
      console.log("ERROR: No feeds in collection")
      return new Response(
        JSON.stringify({
          error: "No feeds in collection",
          collection_id: collection.id,
          details: sourcesError?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const feedIds = sources.map(s => s.feed_id)
    console.log("Feed IDs:", feedIds)

    // Get articles from these feeds
    console.log("Fetching articles for feeds:", feedIds)
    const { data: articles, error: articlesError } = await supabaseClient
      .from("articles")
      .select(
        `
        id,
        title,
        url,
        description,
        content,
        category,
        published_at,
        feed:feeds(title, url)
      `,
      )
      .in("feed_id", feedIds)
      .order("published_at", { ascending: false })
      .limit(50)

    console.log("Articles query result:", { count: articles?.length, error: articlesError })

    if (articlesError) {
      console.log("ERROR: Failed to fetch articles:", articlesError)
      throw articlesError
    }

    if (!articles || articles.length === 0) {
      console.log("WARNING: No articles found for this collection")
    }

    const baseUrl = `${url.protocol}//${url.host}${url.pathname}`

    if (format === "json") {
      const jsonFeed = generateJSON(articles as Article[], collection.name, collection.description || "")
      return new Response(JSON.stringify(jsonFeed, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    } else {
      const rssFeed = generateRSS(articles as Article[], collection.name, collection.description || "", baseUrl)
      return new Response(rssFeed, {
        headers: { ...corsHeaders, "Content-Type": "application/rss+xml" },
        status: 200,
      })
    }
  } catch (error) {
    console.error("Error serving collection:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
