import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const MAX_CONTENT_LENGTH = 50_000

/**
 * Strip HTML boilerplate and return the main article text.
 * Strategy:
 *   1. Remove script/style/nav/header/footer/aside/form blocks entirely
 *   2. Convert block-level tags to newlines so sentences don't run together
 *   3. Strip all remaining tags
 *   4. Collapse whitespace and trim
 */
function extractText(html: string): string {
  // Remove noisy blocks wholesale
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")

  // Turn block-level elements into newlines
  text = text.replace(/<\/(p|div|li|h[1-6]|blockquote|article|section|main)>/gi, "\n")

  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, " ")

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_: string, code: string) => String.fromCharCode(parseInt(code, 10)))

  // Collapse whitespace while preserving paragraph breaks
  text = text
    .split("\n")
    .map((line: string) => line.replace(/\s+/g, " ").trim())
    .filter((line: string) => line.length > 0)
    .join("\n")

  return text.slice(0, MAX_CONTENT_LENGTH)
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "url is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FeedVine/1.0; +https://feedvine.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: `HTTP ${response.status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return new Response(JSON.stringify({ success: false, error: "Not an HTML page" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const html = await response.text()
    const content = extractText(html)

    if (content.length < 100) {
      return new Response(JSON.stringify({ success: false, error: "Could not extract meaningful content" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ success: true, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }
})

