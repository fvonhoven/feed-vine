import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { isCronOrServiceAuth } from "../_shared/security.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ArticlePayload {
  title: string
  url: string
  description: string | null
  category: string | null
  published_at: string
}

interface DeliveryRequest {
  feed_id: string
  feed_title: string
  articles: ArticlePayload[]
}

/**
 * Delivers new articles to subscribed Slack channels using Block Kit messages.
 * Called by fetch-rss whenever new articles are inserted.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!isCronOrServiceAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    })
  }

  try {
    const body: DeliveryRequest = await req.json()
    const { feed_id, feed_title, articles } = body

    if (!feed_id || !articles || articles.length === 0) {
      return new Response(JSON.stringify({ delivered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Find all active Slack subscriptions for this feed
    const { data: subscriptions, error: subErr } = await supabaseAdmin
      .from("slack_subscriptions")
      .select("id, channel_id, installation:slack_installations(slack_bot_token)")
      .eq("feed_id", feed_id)
      .eq("is_active", true)

    if (subErr) {
      console.error("Error fetching Slack subscriptions:", subErr)
      return new Response(JSON.stringify({ error: subErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ delivered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let delivered = 0

    for (const sub of subscriptions) {
      const botToken = (sub.installation as { slack_bot_token: string } | null)?.slack_bot_token
      if (!botToken) continue

      const blocks = buildArticleBlocks(feed_title, articles)

      try {
        const response = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${botToken}`,
          },
          body: JSON.stringify({
            channel: sub.channel_id,
            text: `${articles.length} new article${articles.length > 1 ? "s" : ""} from ${feed_title}`,
            blocks,
            unfurl_links: false,
          }),
        })

        const result = await response.json()
        if (result.ok) {
          delivered++
        } else {
          console.error(`Slack delivery failed for channel ${sub.channel_id}:`, result.error)
        }
      } catch (err) {
        console.error(`Slack delivery error for channel ${sub.channel_id}:`, err)
      }
    }

    return new Response(JSON.stringify({ delivered, total: subscriptions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("slack-deliver error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})

function buildArticleBlocks(feedTitle: string, articles: ArticlePayload[]) {
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `New from ${feedTitle}`, emoji: true },
    },
  ]

  for (const article of articles.slice(0, 10)) {
    const description = (article.description || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim()
      .slice(0, 150)

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${article.url}|${article.title}>*\n${description}${description.length >= 150 ? "..." : ""}`,
      },
      accessory: {
        type: "button",
        text: { type: "plain_text", text: "Read", emoji: true },
        url: article.url,
        action_id: `read_${article.url.slice(-8)}`,
      },
    })
  }

  if (articles.length > 10) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `_...and ${articles.length - 10} more article${articles.length - 10 > 1 ? "s" : ""}_` }],
    })
  }

  return blocks
}
