/**
 * API Usage Statistics
 * Returns API usage stats for the authenticated user
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const url = new URL(req.url)
    const period = url.searchParams.get("period") || "7d" // 7d, 30d, 90d

    // Calculate date range
    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case "24h":
        startDate.setHours(now.getHours() - 24)
        break
      case "7d":
        startDate.setDate(now.getDate() - 7)
        break
      case "30d":
        startDate.setDate(now.getDate() - 30)
        break
      case "90d":
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Get API keys for this user
    const { data: apiKeys } = await supabase.from("api_keys").select("id, name, key_prefix, last_used_at, created_at").eq("user_id", user.id).eq("is_active", true)

    // Get total request count
    const { count: totalRequests } = await supabase
      .from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("window_start", startDate.toISOString())

    // Get requests by endpoint
    const { data: endpointStats } = await supabase
      .from("api_rate_limits")
      .select("endpoint")
      .eq("user_id", user.id)
      .gte("window_start", startDate.toISOString())

    // Count requests per endpoint
    const endpointCounts: Record<string, number> = {}
    endpointStats?.forEach(row => {
      endpointCounts[row.endpoint] = (endpointCounts[row.endpoint] || 0) + 1
    })

    // Get user's plan and rate limits
    const { data: subscription } = await supabase.from("subscriptions").select("plan_id").eq("user_id", user.id).eq("status", "active").single()

    let rateLimit = 100 // Default Pro
    if (subscription?.plan_id === "premium") {
      rateLimit = 2000
    } else if (subscription?.plan_id === "plus") {
      rateLimit = 500
    }

    // Get current hour's usage
    const currentHourStart = new Date()
    currentHourStart.setMinutes(0, 0, 0)

    const { count: currentHourRequests } = await supabase
      .from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("window_start", currentHourStart.toISOString())

    // Get daily usage for the period (for chart)
    const dailyUsage: Record<string, number> = {}
    const { data: allRequests } = await supabase
      .from("api_rate_limits")
      .select("window_start")
      .eq("user_id", user.id)
      .gte("window_start", startDate.toISOString())

    allRequests?.forEach(row => {
      const date = new Date(row.window_start).toISOString().split("T")[0]
      dailyUsage[date] = (dailyUsage[date] || 0) + 1
    })

    const response = {
      success: true,
      data: {
        period,
        totalRequests: totalRequests || 0,
        currentHourRequests: currentHourRequests || 0,
        rateLimit,
        rateLimitRemaining: Math.max(0, rateLimit - (currentHourRequests || 0)),
        apiKeys: apiKeys || [],
        endpointStats: Object.entries(endpointCounts)
          .map(([endpoint, count]) => ({ endpoint, count }))
          .sort((a, b) => b.count - a.count),
        dailyUsage: Object.entries(dailyUsage)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      },
    }

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (error: any) {
    console.error("API usage stats error:", error)
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})

