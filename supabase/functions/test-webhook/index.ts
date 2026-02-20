import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { fireWebhook } from "../_shared/webhooks.ts"

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
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")

    // Get the user from the auth header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      throw new Error("Missing authorization header")
    }

    // Verify user via Supabase Auth API (same pattern as create-checkout-session)
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
    })

    if (!userResponse.ok) {
      throw new Error("Unauthorized")
    }

    const user = await userResponse.json()

    const { webhookId } = await req.json()
    if (!webhookId) {
      throw new Error("Missing webhookId parameter")
    }

    // Look up the webhook - verify it belongs to this user
    const { data: webhook, error: webhookError } = await supabaseClient
      .from("webhooks")
      .select("*")
      .eq("id", webhookId)
      .eq("user_id", user.id)
      .single()

    if (webhookError || !webhook) {
      throw new Error("Webhook not found or access denied")
    }

    const testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from FeedVine",
        webhook: {
          id: webhook.id,
          name: webhook.name,
        },
        test: true,
      },
    }

    const result = await fireWebhook(supabaseClient, webhook, testPayload)

    // Always return 200 so supabase.functions.invoke passes body to client
    return new Response(
      JSON.stringify({
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    )
  } catch (error) {
    console.error("Test webhook error:", error)
    // Always return 200 so supabase.functions.invoke passes body to client
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  }
})
