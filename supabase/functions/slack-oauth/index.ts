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
  const clientId = Deno.env.get("SLACK_CLIENT_ID") ?? ""
  const clientSecret = Deno.env.get("SLACK_CLIENT_SECRET") ?? ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const redirectUri = `${supabaseUrl}/functions/v1/slack-oauth/callback`

  // Step 1: Initiate OAuth — redirect user to Slack's authorization page
  if (url.pathname.endsWith("/install")) {
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Extract team_id from body
    const body = await req.json()
    const teamId = body.team_id
    if (!teamId) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const scopes = "chat:write,channels:read,commands"
    const state = btoa(JSON.stringify({ team_id: teamId, token: authHeader.replace("Bearer ", "") }))
    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`

    return new Response(JSON.stringify({ url: slackAuthUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Step 2: OAuth callback — exchange code for bot token
  if (url.pathname.endsWith("/callback")) {
    const code = url.searchParams.get("code")
    const stateParam = url.searchParams.get("state")

    if (!code || !stateParam) {
      return new Response("Missing code or state", { status: 400 })
    }

    let state: { team_id: string; token: string }
    try {
      state = JSON.parse(atob(stateParam))
    } catch {
      return new Response("Invalid state parameter", { status: 400 })
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error("Slack OAuth error:", tokenData.error)
      return new Response(`<html><body><h1>Connection Failed</h1><p>${tokenData.error}</p><p>Please close this window and try again.</p></body></html>`, {
        headers: { "Content-Type": "text/html" },
        status: 400,
      })
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

    // Upsert the installation
    const { error: upsertError } = await supabaseAdmin.from("slack_installations").upsert(
      {
        team_id: state.team_id,
        slack_workspace_id: tokenData.team.id,
        slack_workspace_name: tokenData.team.name,
        slack_bot_token: tokenData.access_token,
        installed_by: user.id,
      },
      { onConflict: "slack_workspace_id" },
    )

    if (upsertError) {
      console.error("Failed to save Slack installation:", upsertError)
      return new Response(`<html><body><h1>Setup Failed</h1><p>${upsertError.message}</p></body></html>`, {
        headers: { "Content-Type": "text/html" },
        status: 500,
      })
    }

    // Redirect back to settings with success
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173"
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/settings?slack=connected` },
    })
  }

  // Step 3: Disconnect — remove the Slack installation
  if (req.method === "POST") {
    const body = await req.json()

    if (body.action === "disconnect") {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
      const { error } = await supabaseAdmin.from("slack_installations").delete().eq("team_id", body.team_id)
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
