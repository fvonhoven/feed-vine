import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// No shared module imports — fully self-contained to avoid boot failures

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Verify user via Supabase Auth API (verify_jwt=false in config, so we do it manually)
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
      },
    })

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const user = await userResponse.json()
    if (!user?.id) {
      return new Response(JSON.stringify({ success: false, error: "Invalid user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    const body = await req.json()
    const webhookId = body?.webhookId
    if (!webhookId) {
      return new Response(JSON.stringify({ success: false, error: "Missing webhookId parameter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    // Look up the webhook and verify it belongs to this user
    const { data: webhook, error: webhookError } = await supabaseClient
      .from("webhooks")
      .select("*")
      .eq("id", webhookId)
      .eq("user_id", user.id)
      .single()

    if (webhookError || !webhook) {
      return new Response(JSON.stringify({ success: false, error: "Webhook not found or access denied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    // Build test payload
    const testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from FeedVine",
        webhook: { id: webhook.id, name: webhook.name },
        test: true,
      },
    }
    const payloadString = JSON.stringify(testPayload)

    // Build headers
    const postHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "FeedVine-Webhook/1.0",
      "X-FeedVine-Event": "test",
    }
    if (webhook.secret) {
      const sig = await createSignature(payloadString, webhook.secret)
      postHeaders["X-FeedVine-Signature"] = `sha256=${sig}`
    }

    // Fire the webhook
    let statusCode = 0
    let success = false
    let errorMsg = ""
    try {
      const response = await fetch(webhook.url, { method: "POST", headers: postHeaders, body: payloadString })
      statusCode = response.status
      success = response.ok
      if (!response.ok) {
        errorMsg = await response.text().catch(() => "")
      }
    } catch (fetchErr) {
      errorMsg = fetchErr instanceof Error ? fetchErr.message : "Network error"
    }

    // Update webhook status
    await supabaseClient
      .from("webhooks")
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status_code: statusCode || null,
        last_error: success ? null : errorMsg.substring(0, 500),
        failure_count: success ? 0 : (webhook.failure_count ?? 0) + 1,
      })
      .eq("id", webhook.id)

    return new Response(JSON.stringify({ success, statusCode, error: success ? undefined : errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("Test webhook error:", error)
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }
})
