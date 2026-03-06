import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const authHeader = req.headers.get("Authorization") ?? ""

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      })
    }

    const sb = createClient(supabaseUrl, serviceKey)

    const [
      { data: readsPerDay },
      { data: totalStats },
      { data: topFeeds },
      { data: feedHealth },
    ] = await Promise.all([
      sb.rpc("analytics_reads_per_day", { p_user_id: user.id }),
      sb.rpc("analytics_totals", { p_user_id: user.id }),
      sb.rpc("analytics_top_feeds", { p_user_id: user.id }),
      sb.rpc("analytics_feed_health", { p_user_id: user.id }),
    ])

    return new Response(
      JSON.stringify({ readsPerDay, totalStats, topFeeds, feedHealth }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (e) {
    console.error("analytics-stats error:", e)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
