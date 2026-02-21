import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

    // Verify user via Supabase Auth API (verify_jwt=false, manual check)
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: anonKey },
    })

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const user = await userResponse.json()
    if (!user?.id) {
      return new Response(JSON.stringify({ success: false, error: "Invalid user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const body = await req.json()
    const { title, content_html } = body

    if (!title || !content_html) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields: title, content_html" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // Look up MailerLite credentials for this user
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("user_integrations")
      .select("api_key, publication_id")
      .eq("user_id", user.id)
      .eq("provider", "mailerlite")
      .single()

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ success: false, error: "No MailerLite integration found. Connect your account in Settings." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // Parse sender info stored as JSON in publication_id
    let fromEmail = ""
    let fromName = "Newsletter"
    try {
      const senderMeta = integration.publication_id ? JSON.parse(integration.publication_id) : {}
      fromEmail = senderMeta.from_email || ""
      fromName = senderMeta.from_name || "Newsletter"
    } catch {
      // fallback: publication_id might be a plain email string from older saves
      fromEmail = integration.publication_id || ""
    }

    if (!fromEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Sender email not configured. Please update your MailerLite connection in Settings and add a Sender Email.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    const mlHeaders = {
      Authorization: `Bearer ${integration.api_key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    // Attempt 1: create draft campaign WITH content
    // (content field requires MailerLite Advanced plan; we fall back gracefully if rejected)
    const buildPayload = (includeContent: boolean) =>
      JSON.stringify({
        name: title,
        type: "regular",
        emails: [
          {
            subject: title,
            from_name: fromName,
            from: fromEmail,
            ...(includeContent ? { content: content_html } : {}),
          },
        ],
      })

    let campaignResponse = await fetch("https://connect.mailerlite.com/api/campaigns", {
      method: "POST",
      headers: mlHeaders,
      body: buildPayload(true),
    })

    let campaignData = await campaignResponse.json()
    let contentNotAdded = false

    // If failed and the only validation error is about content (plan restriction), retry without it
    if (!campaignResponse.ok) {
      const errors: Record<string, unknown> = campaignData?.errors ?? {}
      const errorKeys = Object.keys(errors)
      const onlyContentError = errorKeys.length > 0 && errorKeys.every(k => k.startsWith("emails.") && k.endsWith(".content"))

      if (onlyContentError) {
        campaignResponse = await fetch("https://connect.mailerlite.com/api/campaigns", {
          method: "POST",
          headers: mlHeaders,
          body: buildPayload(false),
        })
        campaignData = await campaignResponse.json()
        contentNotAdded = true
      }
    }

    if (!campaignResponse.ok) {
      const msg = campaignData?.message || "MailerLite API error"
      return new Response(JSON.stringify({ success: false, error: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    const campaignId = campaignData?.data?.id
    const editUrl = campaignId ? `https://dashboard.mailerlite.com/campaigns/${campaignId}/edit/content` : null

    return new Response(JSON.stringify({ success: true, campaignId, editUrl, contentNotAdded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("send-to-mailerlite error:", error)
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
