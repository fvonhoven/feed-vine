import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

/** Monthly cap per plan; -1 = unlimited. Must stay aligned with frontend PRICING_PLANS (stripe.ts). */
const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  pro: 0, // Starter
  plus: 200, // Creator
  premium: 2000, // Builder — generous fair-use ceiling
  team: 5000,
  team_pro: 15000,
  team_business: 30000,
}

async function summarizeWithClaude(title: string, content: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")

  // Truncate content to avoid excessive token usage (~1500 tokens max input)
  const maxChars = 5000
  const truncated = content.length > maxChars ? content.slice(0, maxChars) + "..." : content

  const prompt = `Summarize the following article in 2-3 sentences. Be concise and capture the key insight.

Title: ${title}
Content: ${truncated}

Return ONLY the summary text, nothing else.`

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text?.trim() || ""
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    // Verify user
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: supabaseAnonKey },
    })
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }
    const user = await userRes.json()
    const userId = user.id

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get user's plan
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .maybeSingle()
    const planId = sub?.plan_id || "free"
    const limit = PLAN_LIMITS[planId] ?? 0

    if (limit === 0) {
      return new Response(JSON.stringify({ error: "AI summaries require Creator plan or higher" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      })
    }

    const currentMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

    const { articleId } = await req.json()
    if (!articleId) {
      return new Response(JSON.stringify({ error: "Missing articleId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // Fetch the article
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, content, description, ai_summary, feed:feeds!inner(user_id)")
      .eq("id", articleId)
      .eq("feed.user_id", userId)
      .single()

    if (articleError || !article) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      })
    }

    // Return cached summary if already generated
    if (article.ai_summary) {
      return new Response(JSON.stringify({ summary: article.ai_summary, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const { data: usageCount, error: claimError } = await supabase.rpc("claim_ai_summary", {
      p_user_id: userId,
      p_month: currentMonth,
      p_limit: limit,
    })
    if (claimError || typeof usageCount !== "number") {
      const limitReached = claimError?.message?.includes("AI_SUMMARY_LIMIT_REACHED")
      return new Response(
        JSON.stringify({ error: limitReached ? `Monthly AI summary limit reached (${limit}/month).` : "Could not reserve AI usage" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: limitReached ? 429 : 503 },
      )
    }

    const textToSummarize = article.content || article.description || article.title
    const summary = await summarizeWithClaude(article.title, textToSummarize)

    if (!summary) {
      throw new Error("Empty summary returned from Claude")
    }

    // Store summary in articles table
    await supabase.from("articles").update({ ai_summary: summary, ai_summary_generated_at: new Date().toISOString() }).eq("id", articleId)

    return new Response(JSON.stringify({ summary, cached: false, usage: { count: usageCount, limit } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("summarize-article error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
