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
}

interface DeliveryRequest {
  feed_id: string
  feed_title: string
  articles: ArticlePayload[]
}

/**
 * Delivers new articles to subscribed Discord channels as rich embeds.
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

    // Find all active Discord subscriptions for this feed
    const { data: subscriptions, error: subErr } = await supabaseAdmin
      .from("discord_subscriptions")
      .select("id, channel_id, installation:discord_installations(discord_bot_token)")
      .eq("feed_id", feed_id)
      .eq("is_active", true)

    if (subErr) {
      console.error("Error fetching Discord subscriptions:", subErr)
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
      const botToken = (sub.installation as { discord_bot_token: string } | null)?.discord_bot_token
      if (!botToken) continue

      const embeds = buildArticleEmbeds(feed_title, articles)

      try {
        const response = await fetch(`https://discord.com/api/v10/channels/${sub.channel_id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bot ${botToken}`,
          },
          body: JSON.stringify({
            content: `**${articles.length} new article${articles.length > 1 ? "s" : ""} from ${feed_title}**`,
            embeds,
          }),
        })

        if (response.ok) {
          delivered++
        } else {
          const errText = await response.text()
          console.error(`Discord delivery failed for channel ${sub.channel_id}:`, errText)
        }
      } catch (err) {
        console.error(`Discord delivery error for channel ${sub.channel_id}:`, err)
      }
    }

    return new Response(JSON.stringify({ delivered, total: subscriptions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("discord-deliver error:", error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})

function buildArticleEmbeds(feedTitle: string, articles: ArticlePayload[]) {
  return articles.slice(0, 10).map(article => {
    const description = (article.description || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim()
      .slice(0, 200)

    return {
      title: article.title,
      url: article.url,
      description: description || undefined,
      color: 0x5865F2,
      author: { name: feedTitle },
      footer: {
        text: article.category || "Article",
      },
    }
  })
}
