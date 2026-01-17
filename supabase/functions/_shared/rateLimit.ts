/**
 * Rate Limiting Middleware
 * Enforces rate limits based on plan tier
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import type { AuthenticatedUser } from "./apiAuth.ts"

// Rate limits per plan (requests per hour)
const RATE_LIMITS: Record<string, number> = {
  free: 0, // No API access
  pro: 100,
  plus: 500,
  premium: 2000,
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
  error?: string
}

/**
 * Check if request is within rate limit
 */
export async function checkRateLimit(user: AuthenticatedUser, endpoint: string): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  const limit = RATE_LIMITS[user.plan_id] || 0
  const now = new Date()
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0)
  const resetAt = new Date(windowStart.getTime() + 60 * 60 * 1000) // 1 hour from window start

  try {
    // Get or create rate limit record for this hour
    const { data: rateLimitRecord, error: fetchError } = await supabase
      .from("api_rate_limits")
      .select("*")
      .eq("api_key_id", user.api_key_id)
      .eq("endpoint", endpoint)
      .eq("window_start", windowStart.toISOString())
      .single()

    let currentCount = 0

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw fetchError
    }

    if (rateLimitRecord) {
      currentCount = rateLimitRecord.request_count
    }

    // Check if limit exceeded
    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
        error: `Rate limit exceeded. Limit: ${limit} requests/hour. Try again after ${resetAt.toISOString()}`,
      }
    }

    // Increment counter
    if (rateLimitRecord) {
      await supabase
        .from("api_rate_limits")
        .update({ request_count: currentCount + 1 })
        .eq("id", rateLimitRecord.id)
    } else {
      await supabase.from("api_rate_limits").insert({
        api_key_id: user.api_key_id,
        endpoint,
        request_count: 1,
        window_start: windowStart.toISOString(),
      })
    }

    return {
      allowed: true,
      limit,
      remaining: limit - currentCount - 1,
      resetAt,
    }
  } catch (error) {
    console.error("Rate limit check error:", error)
    // On error, allow the request but log it
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt,
    }
  }
}

/**
 * Log API usage for analytics
 */
export async function logApiUsage(
  user: AuthenticatedUser,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  req: Request,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    await supabase.from("api_usage_logs").insert({
      api_key_id: user.api_key_id,
      user_id: user.id,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
    })
  } catch (error) {
    // Don't fail the request if logging fails
    console.error("Failed to log API usage:", error)
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(headers: Headers, rateLimit: RateLimitResult): Headers {
  headers.set("X-RateLimit-Limit", rateLimit.limit.toString())
  headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString())
  headers.set("X-RateLimit-Reset", Math.floor(rateLimit.resetAt.getTime() / 1000).toString())
  return headers
}

