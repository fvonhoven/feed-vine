/**
 * IP-based Rate Limiting
 * Protects endpoints from abuse by limiting requests per IP address
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
  retryAfter?: number
}

// Default rate limits for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  signup: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 signups per hour
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 login attempts per 15 minutes
  api: { windowMs: 60 * 60 * 1000, maxRequests: 100 }, // 100 requests per hour
  default: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
}

/**
 * Extract IP address from request
 */
export function getClientIp(req: Request): string {
  // Try various headers that might contain the real IP
  const headers = req.headers

  // Cloudflare
  const cfIp = headers.get("cf-connecting-ip")
  if (cfIp) return cfIp

  // Standard forwarded headers
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim()
  }

  const realIp = headers.get("x-real-ip")
  if (realIp) return realIp

  // Fallback to a default (should rarely happen)
  return "unknown"
}

/**
 * Check if IP is within rate limit
 */
export async function checkIpRateLimit(req: Request, endpoint: string, config?: RateLimitConfig): Promise<RateLimitResult> {
  const ip = getClientIp(req)
  const rateLimitConfig = config || RATE_LIMIT_CONFIGS.default

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  const now = new Date()
  const windowStart = new Date(now.getTime() - rateLimitConfig.windowMs)

  try {
    // Create ip_rate_limits table if it doesn't exist (should be in migration)
    // Count requests from this IP in the current window
    const { data: recentRequests, error: countError } = await supabase
      .from("ip_rate_limits")
      .select("id, created_at")
      .eq("ip_address", ip)
      .eq("endpoint", endpoint)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: false })

    if (countError) {
      console.error("Rate limit check error:", countError)
      // On error, allow the request (fail open)
      return {
        allowed: true,
        limit: rateLimitConfig.maxRequests,
        remaining: rateLimitConfig.maxRequests,
        resetAt: new Date(now.getTime() + rateLimitConfig.windowMs),
      }
    }

    const requestCount = recentRequests?.length || 0

    // Check if limit exceeded
    if (requestCount >= rateLimitConfig.maxRequests) {
      const oldestRequest = recentRequests?.[recentRequests.length - 1]
      const resetAt = oldestRequest ? new Date(new Date(oldestRequest.created_at).getTime() + rateLimitConfig.windowMs) : new Date(now.getTime() + rateLimitConfig.windowMs)

      const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000)

      return {
        allowed: false,
        limit: rateLimitConfig.maxRequests,
        remaining: 0,
        resetAt,
        retryAfter,
      }
    }

    // Record this request
    await supabase.from("ip_rate_limits").insert({
      ip_address: ip,
      endpoint,
      created_at: now.toISOString(),
    })

    // Clean up old records (older than window)
    await supabase.from("ip_rate_limits").delete().eq("ip_address", ip).eq("endpoint", endpoint).lt("created_at", windowStart.toISOString())

    const resetAt = new Date(now.getTime() + rateLimitConfig.windowMs)

    return {
      allowed: true,
      limit: rateLimitConfig.maxRequests,
      remaining: rateLimitConfig.maxRequests - requestCount - 1,
      resetAt,
    }
  } catch (error) {
    console.error("Rate limit error:", error)
    // On error, allow the request (fail open)
    return {
      allowed: true,
      limit: rateLimitConfig.maxRequests,
      remaining: rateLimitConfig.maxRequests,
      resetAt: new Date(now.getTime() + rateLimitConfig.windowMs),
    }
  }
}

/**
 * Add rate limit headers to response
 */
export function addIpRateLimitHeaders(headers: Record<string, string>, result: RateLimitResult): Record<string, string> {
  return {
    ...headers,
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
    ...(result.retryAfter ? { "Retry-After": result.retryAfter.toString() } : {}),
  }
}

