import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  mailerLiteCampaignsDraftsUrl,
  mailerLiteHeaders,
  mailerLiteTopLevelMessage,
  readMailerLiteJson,
} from "../_shared/mailerliteClient.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/** Avoid gateway timeouts / API limits; truncation keeps campaigns creatable. */
const MAX_CONTENT_HTML_CHARS = 450_000

/** Retry without HTML body when API rejects content (plan, invalid HTML, size, etc.). */
function shouldRetryCampaignWithoutContent(data: Record<string, unknown>): boolean {
  const msgEarly = mailerLiteTopLevelMessage(data).toLowerCase()
  if (/rate|throttle|too many requests|429|quota/.test(msgEarly)) return false

  const errors = data.errors as Record<string, unknown> | undefined
  if (errors && typeof errors === "object") {
    const keys = Object.keys(errors)
    if (keys.length === 0) return false
    const onlyContentKeys = keys.every(k => k === "content" || k.includes(".content") || /^emails\.\d+\.content$/.test(k))
    if (onlyContentKeys) return true
  }
  const msg = mailerLiteTopLevelMessage(data).toLowerCase()
  if (
    /content|html|advanced|plan|body|invalid|malformed|too large|maximum|size|not allowed|unprocessable/.test(msg) &&
    !/unauthor|invalid.*token|invalid.*key|forbidden|401|403/.test(msg)
  ) {
    return true
  }
  return false
}

function jsonOk(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  })
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

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

    let body: { title?: string; content_html?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }
    const { title, content_html } = body

    if (!title || !content_html) {
      return jsonOk({ success: false, error: "Missing required fields: title, content_html" })
    }

    let contentHtml = String(content_html)
    if (contentHtml.length > MAX_CONTENT_HTML_CHARS) {
      contentHtml =
        contentHtml.slice(0, MAX_CONTENT_HTML_CHARS) +
        `<p style="color:#666;font-size:13px;margin-top:1em;"><em>Digest truncated (${MAX_CONTENT_HTML_CHARS.toLocaleString()} character limit). Try fewer articles or a smaller date range.</em></p>`
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("user_integrations")
      .select("api_key, publication_id")
      .eq("user_id", user.id)
      .eq("provider", "mailerlite")
      .single()

    if (integrationError || !integration) {
      return jsonOk({ success: false, error: "No MailerLite integration found. Connect your account in Settings." })
    }

    const apiKey = integration.api_key as string
    if (!String(apiKey).trim()) {
      return jsonOk({ success: false, error: "MailerLite API key is empty. Add it in Settings." })
    }

    let fromEmail = ""
    let fromName = "Newsletter"
    try {
      const senderMeta = integration.publication_id ? JSON.parse(integration.publication_id as string) : {}
      fromEmail = senderMeta.from_email || ""
      fromName = senderMeta.from_name || "Newsletter"
    } catch {
      fromEmail = (integration.publication_id as string) || ""
    }

    if (!fromEmail) {
      return jsonOk({
        success: false,
        error:
          "Sender email not configured. Please update your MailerLite connection in Settings and add a Sender Email.",
      })
    }

    const mlHeaders = mailerLiteHeaders(apiKey)

    const buildPayload = (includeContent: boolean) =>
      JSON.stringify({
        name: title,
        type: "regular",
        emails: [
          {
            subject: title,
            from_name: fromName,
            from: fromEmail,
            ...(includeContent ? { content: contentHtml } : {}),
          },
        ],
      })

    let campaignResponse = await fetch("https://connect.mailerlite.com/api/campaigns", {
      method: "POST",
      headers: mlHeaders,
      body: buildPayload(true),
    })

    let campaignData = await readMailerLiteJson(campaignResponse)
    let contentNotAdded = false

    if (!campaignResponse.ok && shouldRetryCampaignWithoutContent(campaignData)) {
      campaignResponse = await fetch("https://connect.mailerlite.com/api/campaigns", {
        method: "POST",
        headers: mlHeaders,
        body: buildPayload(false),
      })
      campaignData = await readMailerLiteJson(campaignResponse)
      contentNotAdded = true
    }

    if (!campaignResponse.ok) {
      const msg = mailerLiteTopLevelMessage(campaignData)
      return jsonOk({ success: false, error: msg })
    }

    const data = campaignData?.data as { id?: string } | undefined
    const campaignId = data?.id
    // Stable URL — MailerLite often 404s on /campaigns/:id/... deep links; Drafts tab always loads.
    const editUrl = mailerLiteCampaignsDraftsUrl()

    return jsonOk({ success: true, campaignId, editUrl, contentNotAdded })
  } catch (error) {
    console.error("send-to-mailerlite error:", error)
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
