import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Valid categories
const VALID_CATEGORIES = ["AI News", "Tools", "Opinion", "Startups", "Backend", "Tutorial", "Research", "Uncategorized"]

/**
 * Categorize an article using Claude API
 */
async function categorizeWithClaude(title: string, description: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")

  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set, defaulting to Uncategorized")
    return "Uncategorized"
  }

  try {
    const prompt = `Categorize this article into ONE of these categories: AI News, Tools, Opinion, Startups, Backend, Tutorial, Research

Title: ${title}
Description: ${description || "No description available"}

Return ONLY the category name, nothing else. If unsure, return "Uncategorized".`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022", // Use Haiku for fast, cheap categorization
        max_tokens: 20,
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
      return "Uncategorized"
    }

    const data = await response.json()
    const category = data.content?.[0]?.text?.trim() || "Uncategorized"

    // Validate category
    if (VALID_CATEGORIES.includes(category)) {
      return category
    }

    console.warn(`Invalid category returned: ${category}, defaulting to Uncategorized`)
    return "Uncategorized"
  } catch (error) {
    console.error("Error calling Claude API:", error)
    return "Uncategorized"
  }
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { title, description } = await req.json()

    if (!title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const category = await categorizeWithClaude(title, description || "")

    return new Response(JSON.stringify({ category }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in categorize-article function:", error)
    return new Response(JSON.stringify({ error: error.message, category: "Uncategorized" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
