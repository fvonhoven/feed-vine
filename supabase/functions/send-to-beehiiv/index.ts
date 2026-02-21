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

    // Verify user via Supabase Auth API (verify_jwt=false, so manual check)
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

    // Look up Beehiiv credentials for this user
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from("user_integrations")
      .select("api_key, publication_id")
      .eq("user_id", user.id)
      .eq("provider", "beehiiv")
      .single()

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ success: false, error: "No Beehiiv integration found. Connect your account in Settings." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    if (!integration.publication_id) {
      return new Response(JSON.stringify({ success: false, error: "Beehiiv Publication ID is not configured." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // Call Beehiiv API to create a draft post
    const beehiivResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${integration.publication_id}/posts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${integration.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content_html,
          status: "draft",
          platform: "web",
        }),
      },
    )

    const beehiivData = await beehiivResponse.json()

    if (!beehiivResponse.ok) {
      const message = beehiivData?.errors?.[0]?.message || beehiivData?.message || "Beehiiv API error"
      return new Response(JSON.stringify({ success: false, error: message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    const postId = beehiivData?.data?.id
    const webUrl = beehiivData?.data?.web_url || null

    return new Response(JSON.stringify({ success: true, postId, webUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error("send-to-beehiiv error:", error)
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})

