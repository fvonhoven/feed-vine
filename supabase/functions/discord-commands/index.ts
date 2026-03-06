import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * Handles Discord interaction webhook for /feedvine slash commands.
 * Discord requires a response within 3 seconds, so we ACK immediately
 * and use follow-up messages for longer operations.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } })
  }

  try {
    const body = await req.json()

    // Discord sends a PING to verify the endpoint
    if (body.type === 1) {
      return jsonResponse({ type: 1 })
    }

    // Application command (slash command)
    if (body.type === 2) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

      const guildId = body.guild_id
      const channelId = body.channel_id
      const subcommand = body.data?.options?.[0]?.name
      const args = body.data?.options?.[0]?.options?.[0]?.value || ""

      // Find installation
      const { data: installation } = await supabaseAdmin
        .from("discord_installations")
        .select("id, team_id")
        .eq("guild_id", guildId)
        .single()

      if (!installation) {
        return interactionResponse("FeedVine is not connected to this server. Ask your team admin to connect it from Settings.")
      }

      switch (subcommand) {
        case "subscribe": {
          if (!args) {
            return interactionResponse("Please provide a feed name or URL to subscribe to.")
          }

          const { data: feeds } = await supabaseAdmin
            .from("feeds")
            .select("id, title, url")
            .or(`title.ilike.%${args}%,url.ilike.%${args}%`)
            .limit(1)

          if (!feeds || feeds.length === 0) {
            return interactionResponse(`No feed found matching "${args}". Make sure the feed exists in your FeedVine account.`)
          }

          const feed = feeds[0]

          const { data: existing } = await supabaseAdmin
            .from("discord_subscriptions")
            .select("id")
            .eq("installation_id", installation.id)
            .eq("channel_id", channelId)
            .eq("feed_id", feed.id)
            .maybeSingle()

          if (existing) {
            return interactionResponse(`This channel is already subscribed to **${feed.title}**.`)
          }

          const { error: subErr } = await supabaseAdmin.from("discord_subscriptions").insert({
            installation_id: installation.id,
            channel_id: channelId,
            channel_name: body.channel?.name || null,
            feed_id: feed.id,
            is_active: true,
          })

          if (subErr) {
            console.error("Failed to create Discord subscription:", subErr)
            return interactionResponse("Failed to create subscription. Please try again.")
          }

          return interactionResponse(`Subscribed to **${feed.title}**! New articles will be posted to this channel.`)
        }

        case "list": {
          const { data: subs } = await supabaseAdmin
            .from("discord_subscriptions")
            .select("id, feed_id, collection_id, is_active, feed:feeds(title), collection:feed_collections(name)")
            .eq("installation_id", installation.id)
            .eq("channel_id", channelId)

          if (!subs || subs.length === 0) {
            return interactionResponse("No subscriptions in this channel. Use `/feedvine subscribe <feed>` to add one.")
          }

          const lines = subs.map((s: Record<string, unknown>, i: number) => {
            const name = (s.feed as { title: string } | null)?.title || (s.collection as { name: string } | null)?.name || "Unknown"
            const status = (s.is_active as boolean) ? "" : " (paused)"
            return `${i + 1}. **${name}**${status}`
          })

          return interactionResponse(`**Subscriptions in this channel:**\n${lines.join("\n")}`)
        }

        case "unsubscribe": {
          if (!args) {
            return interactionResponse("Please provide the feed name to unsubscribe from.")
          }

          const { data: subs } = await supabaseAdmin
            .from("discord_subscriptions")
            .select("id, feed:feeds(title)")
            .eq("installation_id", installation.id)
            .eq("channel_id", channelId)

          const matching = subs?.find((s: Record<string, unknown>) => {
            const title = (s.feed as { title: string } | null)?.title || ""
            return title.toLowerCase().includes(args.toLowerCase())
          })

          if (!matching) {
            return interactionResponse(`No subscription matching "${args}" in this channel.`)
          }

          await supabaseAdmin.from("discord_subscriptions").delete().eq("id", matching.id)

          const feedTitle = (matching.feed as { title: string } | null)?.title || args
          return interactionResponse(`Unsubscribed from **${feedTitle}**.`)
        }

        case "digest": {
          const { data: subs } = await supabaseAdmin
            .from("discord_subscriptions")
            .select("feed_id")
            .eq("installation_id", installation.id)
            .eq("channel_id", channelId)
            .eq("is_active", true)

          const feedIds = subs?.map((s: { feed_id: string | null }) => s.feed_id).filter(Boolean) || []
          if (feedIds.length === 0) {
            return interactionResponse("No active subscriptions in this channel.")
          }

          const { data: articles } = await supabaseAdmin
            .from("articles")
            .select("title, url, description, published_at, feed:feeds(title)")
            .in("feed_id", feedIds)
            .order("published_at", { ascending: false })
            .limit(5)

          if (!articles || articles.length === 0) {
            return interactionResponse("No recent articles from your subscribed feeds.")
          }

          const embeds = articles.map((article: Record<string, unknown>) => {
            const feedTitle = (article.feed as { title: string } | null)?.title || ""
            const description = ((article.description as string) || "")
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .trim()
              .slice(0, 200)

            return {
              title: article.title as string,
              url: article.url as string,
              description: description || undefined,
              color: 0x5865F2,
              footer: { text: feedTitle },
            }
          })

          return jsonResponse({
            type: 4,
            data: { embeds },
          })
        }

        default:
          return interactionResponse(
            "**FeedVine Commands:**\n" +
            "• `/feedvine subscribe <feed>` — Subscribe this channel\n" +
            "• `/feedvine list` — List subscriptions\n" +
            "• `/feedvine unsubscribe <feed>` — Remove subscription\n" +
            "• `/feedvine digest` — Post latest articles"
          )
      }
    }

    return jsonResponse({ type: 1 })
  } catch (error) {
    console.error("discord-commands error:", error)
    return interactionResponse("Something went wrong. Please try again.")
  }
})

function jsonResponse(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  })
}

function interactionResponse(content: string) {
  return jsonResponse({
    type: 4,
    data: { content, flags: 64 }, // 64 = ephemeral
  })
}
