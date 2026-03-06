import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const clientId = Deno.env.get("DISCORD_CLIENT_ID") ?? ""
  const clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET") ?? ""
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN") ?? ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const redirectUri = `${supabaseUrl}/functions/v1/discord-oauth/callback`

  // Step 1: Initiate OAuth — redirect user to Discord's authorization page
  if (url.pathname.endsWith("/install")) {
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = await req.json()
    const teamId = body.team_id
    if (!teamId) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const permissions = "2048" // Send Messages
    const scope = "bot applications.commands"
    const state = btoa(JSON.stringify({ team_id: teamId, token: authHeader.replace("Bearer ", "") }))
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`

    return new Response(JSON.stringify({ url: discordAuthUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Step 2: OAuth callback — exchange code and save installation
  if (url.pathname.endsWith("/callback")) {
    const code = url.searchParams.get("code")
    const stateParam = url.searchParams.get("state")
    const guildId = url.searchParams.get("guild_id")

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400 })
    }

    let state: { team_id: string; token: string }
    try {
      state = JSON.parse(atob(stateParam))
    } catch {
      return new Response("Invalid state parameter", { status: 400 })
    }

    // Exchange code for access token (to verify the install)
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error("Discord OAuth error:", tokenData.error)
      return new Response(`<html><body><h1>Connection Failed</h1><p>${tokenData.error_description || tokenData.error}</p></body></html>`, {
        headers: { "Content-Type": "text/html" },
        status: 400,
      })
    }

    const effectiveGuildId = guildId || tokenData.guild?.id

    if (!effectiveGuildId) {
      return new Response(`<html><body><h1>Connection Failed</h1><p>No server selected. Please try again and select a server.</p></body></html>`, {
        headers: { "Content-Type": "text/html" },
        status: 400,
      })
    }

    // Get guild info
    let guildName = tokenData.guild?.name || null
    if (!guildName) {
      try {
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${effectiveGuildId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        })
        if (guildRes.ok) {
          const guildData = await guildRes.json()
          guildName = guildData.name
        }
      } catch {
        // Non-critical
      }
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Verify the user's JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: `Bearer ${state.token}` } },
    })
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return new Response(`<html><body><h1>Authentication Failed</h1><p>Please close this window and try again.</p></body></html>`, {
        headers: { "Content-Type": "text/html" },
        status: 401,
      })
    }

    // Upsert the installation (bot token is shared, stored in env — we save the guild mapping)
    const { error: upsertError } = await supabaseAdmin.from("discord_installations").upsert(
      {
        team_id: state.team_id,
        guild_id: effectiveGuildId,
        guild_name: guildName,
        discord_bot_token: botToken,
        installed_by: user.id,
      },
      { onConflict: "guild_id" },
    )

    if (upsertError) {
      console.error("Failed to save Discord installation:", upsertError)
      return new Response(`<html><body><h1>Setup Failed</h1><p>${upsertError.message}</p></body></html>`, {
        headers: { "Content-Type": "text/html" },
        status: 500,
      })
    }

    // Register slash commands for this guild
    try {
      await registerSlashCommands(clientId, botToken, effectiveGuildId)
    } catch (err) {
      console.error("Failed to register slash commands:", err)
    }

    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173"
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/settings?discord=connected` },
    })
  }

  // Step 3: Disconnect
  if (req.method === "POST") {
    const body = await req.json()
    if (body.action === "disconnect") {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
      const { error } = await supabaseAdmin.from("discord_installations").delete().eq("team_id", body.team_id)
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  }

  return new Response(JSON.stringify({ error: "Unknown endpoint" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})

async function registerSlashCommands(clientId: string, botToken: string, guildId: string) {
  const commands = [
    {
      name: "feedvine",
      description: "Manage FeedVine RSS subscriptions",
      options: [
        {
          name: "subscribe",
          description: "Subscribe this channel to an RSS feed",
          type: 1, // SUB_COMMAND
          options: [
            { name: "feed", description: "Feed name or URL to subscribe to", type: 3, required: true }, // STRING
          ],
        },
        {
          name: "list",
          description: "List feed subscriptions in this channel",
          type: 1,
        },
        {
          name: "unsubscribe",
          description: "Unsubscribe from a feed in this channel",
          type: 1,
          options: [
            { name: "feed", description: "Feed name to unsubscribe from", type: 3, required: true },
          ],
        },
        {
          name: "digest",
          description: "Post the latest articles from subscribed feeds",
          type: 1,
        },
      ],
    },
  ]

  const response = await fetch(
    `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to register commands: ${text}`)
  }
}
