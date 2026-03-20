import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { escapeFilterValue } from "../_shared/security.ts"
import { verifySlackSignature } from "../_shared/slackVerify.ts"
import { isValidHttpUrl } from "../_shared/security.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * Handles Slack slash commands: /feedvine subscribe, list, unsubscribe, digest
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const signingSecret = Deno.env.get("SLACK_SIGNING_SECRET")
    if (!signingSecret) {
      return new Response(JSON.stringify({ error: "Slack signing not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503,
      })
    }

    const signature = req.headers.get("X-Slack-Signature")
    const timestamp = req.headers.get("X-Slack-Request-Timestamp")
    const valid = await verifySlackSignature(signingSecret, signature, timestamp, rawBody)
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const params = new URLSearchParams(rawBody)
    const command = params.get("command") as string
    const text = (params.get("text") || "").trim()
    const channelId = params.get("channel_id") as string
    const channelName = params.get("channel_name") as string
    const slackTeamId = params.get("team_id") as string
    const responseUrl = params.get("response_url") as string

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Find the installation for this Slack workspace
    const { data: installation, error: instErr } = await supabaseAdmin
      .from("slack_installations")
      .select("id, team_id")
      .eq("slack_workspace_id", slackTeamId)
      .single()

    if (instErr || !installation) {
      return slackResponse("FeedVine is not connected to this workspace. Ask your team admin to connect it from Settings.")
    }

    const subcommand = text.split(" ")[0]?.toLowerCase() || "help"
    const args = text.substring(subcommand.length).trim()

    switch (subcommand) {
      case "subscribe": {
        if (!args) {
          return slackResponse("Usage: `/feedvine subscribe <feed name or URL>`\nSubscribes this channel to a feed.")
        }

        const escaped = escapeFilterValue(args)
        const { data: feeds } = await supabaseAdmin
          .from("feeds")
          .select("id, title, url")
          .or(`title.ilike.%${escaped}%,url.ilike.%${escaped}%`)
          .limit(1)

        if (!feeds || feeds.length === 0) {
          return slackResponse(`No feed found matching "${args}". Make sure the feed exists in your FeedVine account.`)
        }

        const feed = feeds[0]

        // Check for existing subscription
        const { data: existing } = await supabaseAdmin
          .from("slack_subscriptions")
          .select("id")
          .eq("installation_id", installation.id)
          .eq("channel_id", channelId)
          .eq("feed_id", feed.id)
          .maybeSingle()

        if (existing) {
          return slackResponse(`This channel is already subscribed to *${feed.title}*.`)
        }

        // Create subscription
        const { error: subErr } = await supabaseAdmin.from("slack_subscriptions").insert({
          installation_id: installation.id,
          channel_id: channelId,
          channel_name: channelName,
          feed_id: feed.id,
          is_active: true,
        })

        if (subErr) {
          console.error("Failed to create Slack subscription:", subErr)
          return slackResponse("Failed to create subscription. Please try again.")
        }

        return slackResponse(`Subscribed to *${feed.title}*! New articles will be posted to this channel.`)
      }

      case "list": {
        const { data: subs } = await supabaseAdmin
          .from("slack_subscriptions")
          .select("id, feed_id, collection_id, is_active, feed:feeds(title), collection:feed_collections(name)")
          .eq("installation_id", installation.id)
          .eq("channel_id", channelId)

        if (!subs || subs.length === 0) {
          return slackResponse("No subscriptions in this channel. Use `/feedvine subscribe <feed>` to add one.")
        }

        const lines = subs.map((s: Record<string, unknown>, i: number) => {
          const name = (s.feed as { title: string } | null)?.title || (s.collection as { name: string } | null)?.name || "Unknown"
          const status = (s.is_active as boolean) ? "" : " (paused)"
          return `${i + 1}. *${name}*${status}`
        })

        return slackResponse(`*Subscriptions in #${channelName}:*\n${lines.join("\n")}`)
      }

      case "unsubscribe": {
        if (!args) {
          return slackResponse("Usage: `/feedvine unsubscribe <feed name>`\nRemoves the subscription from this channel.")
        }

        // Find subscriptions that match the name
        const { data: subs } = await supabaseAdmin
          .from("slack_subscriptions")
          .select("id, feed:feeds(title)")
          .eq("installation_id", installation.id)
          .eq("channel_id", channelId)

        const matching = subs?.find((s: Record<string, unknown>) => {
          const title = (s.feed as { title: string } | null)?.title || ""
          return title.toLowerCase().includes(args.toLowerCase())
        })

        if (!matching) {
          return slackResponse(`No subscription matching "${args}" in this channel.`)
        }

        const { error: delErr } = await supabaseAdmin.from("slack_subscriptions").delete().eq("id", matching.id)
        if (delErr) {
          return slackResponse("Failed to remove subscription. Please try again.")
        }

        const feedTitle = (matching.feed as { title: string } | null)?.title || args
        return slackResponse(`Unsubscribed from *${feedTitle}*.`)
      }

      case "digest": {
        // Post a quick digest of latest articles to the channel
        const { data: subs } = await supabaseAdmin
          .from("slack_subscriptions")
          .select("feed_id")
          .eq("installation_id", installation.id)
          .eq("channel_id", channelId)
          .eq("is_active", true)

        const feedIds = subs?.map((s: { feed_id: string | null }) => s.feed_id).filter(Boolean) || []
        if (feedIds.length === 0) {
          return slackResponse("No active subscriptions in this channel to build a digest from.")
        }

        const { data: articles } = await supabaseAdmin
          .from("articles")
          .select("title, url, description, published_at, feed:feeds(title)")
          .in("feed_id", feedIds)
          .order("published_at", { ascending: false })
          .limit(5)

        if (!articles || articles.length === 0) {
          return slackResponse("No recent articles from your subscribed feeds.")
        }

        const blocks = buildDigestBlocks(articles)
        if (responseUrl && isValidHttpUrl(responseUrl)) {
          await fetch(responseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ response_type: "in_channel", blocks }),
          })
        }

        return new Response("", { status: 200 })
      }

      default:
        return slackResponse(
          "*FeedVine Slash Commands:*\n" +
          "• `/feedvine subscribe <feed>` — Subscribe this channel to a feed\n" +
          "• `/feedvine list` — List subscriptions in this channel\n" +
          "• `/feedvine unsubscribe <feed>` — Remove a subscription\n" +
          "• `/feedvine digest` — Post latest articles to this channel"
        )
    }
  } catch (error) {
    console.error("slack-commands error:", error)
    return slackResponse("Something went wrong. Please try again.")
  }
})

function slackResponse(text: string) {
  return new Response(JSON.stringify({ response_type: "ephemeral", text }), {
    headers: { "Content-Type": "application/json" },
  })
}

function buildDigestBlocks(articles: Array<Record<string, unknown>>) {
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "Latest from your feeds", emoji: true },
    },
  ]

  for (const article of articles) {
    const feedTitle = (article.feed as { title: string } | null)?.title || ""
    const description = ((article.description as string) || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim()
      .slice(0, 150)

    blocks.push(
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${article.url}|${article.title}>*\n${description}${description.length >= 150 ? "..." : ""}\n_${feedTitle}_`,
        },
      },
      { type: "divider" },
    )
  }

  return blocks
}
