/**
 * API v1 - Feeds Endpoints
 * CRUD operations for RSS feeds
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { authenticateApiKey, extractApiKey } from "../_shared/apiAuth.ts"
import { checkRateLimit, logApiUsage, addRateLimitHeaders } from "../_shared/rateLimit.ts"
import {
  corsPreflightResponse,
  successResponse,
  errorResponse,
  parsePaginationParams,
  createPaginationMeta,
  parseJsonBody,
  validateRequiredFields,
} from "../_shared/apiResponse.ts"

serve(async req => {
  const startTime = Date.now()

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsPreflightResponse()
  }

  try {
    // Authenticate API key
    const apiKey = extractApiKey(req)
    if (!apiKey) {
      return errorResponse("Missing API key. Include 'Authorization: Bearer YOUR_API_KEY' header.", 401)
    }

    const authResult = await authenticateApiKey(apiKey)
    if (!authResult.success) {
      return errorResponse(authResult.error || "Authentication failed", authResult.statusCode || 401)
    }

    const user = authResult.user!

    // Check rate limit
    const rateLimit = await checkRateLimit(user, "/api/v1/feeds")
    if (!rateLimit.allowed) {
      const response = errorResponse(rateLimit.error || "Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED")
      return new Response(response.body, {
        status: 429,
        headers: addRateLimitHeaders(new Headers(response.headers), rateLimit),
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const feedId = pathParts[3] // /api/v1/feeds/:id

    let response: Response
    let statusCode = 200

    // GET /api/v1/feeds - List all feeds
    if (req.method === "GET" && !feedId) {
      const { page, limit, offset } = parsePaginationParams(url)

      const { data: feeds, error, count } = await supabase
        .from("feeds")
        .select("id, url, title, status, last_fetched, error_message, created_at, category:categories(id, name, color)", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      response = successResponse(feeds, createPaginationMeta(page, limit, count || 0))
    }

    // GET /api/v1/feeds/:id - Get specific feed
    else if (req.method === "GET" && feedId) {
      const { data: feed, error } = await supabase
        .from("feeds")
        .select("id, url, title, status, last_fetched, error_message, created_at, category:categories(id, name, color)")
        .eq("id", feedId)
        .eq("user_id", user.id)
        .single()

      if (error || !feed) {
        response = errorResponse("Feed not found", 404, "NOT_FOUND")
        statusCode = 404
      } else {
        response = successResponse(feed)
      }
    }

    // POST /api/v1/feeds - Create new feed
    else if (req.method === "POST" && !feedId) {
      const { success: parseSuccess, data: body, error: parseError } = await parseJsonBody(req)

      if (!parseSuccess) {
        response = errorResponse(parseError || "Invalid request body", 400)
        statusCode = 400
      } else {
        const validation = validateRequiredFields(body, ["url"])
        if (!validation.valid) {
          response = errorResponse(`Missing required fields: ${validation.missing?.join(", ")}`, 400, "VALIDATION_ERROR")
          statusCode = 400
        } else {
          // Validate URL format
          try {
            new URL(body.url)
          } catch {
            response = errorResponse("Invalid URL format", 400, "INVALID_URL")
            statusCode = 400
          }

          if (!response) {
            const { data: newFeed, error: insertError } = await supabase
              .from("feeds")
              .insert({
                user_id: user.id,
                url: body.url,
                title: body.title || new URL(body.url).hostname,
                category_id: body.category_id || null,
                status: "active",
              })
              .select("id, url, title, status, created_at")
              .single()

            if (insertError) {
              if (insertError.code === "23505") {
                // Unique constraint violation
                response = errorResponse("Feed URL already exists", 409, "DUPLICATE_FEED")
                statusCode = 409
              } else {
                throw insertError
              }
            } else {
              response = successResponse(newFeed, null, 201)
              statusCode = 201
            }
          }
        }
      }
    }

    // DELETE /api/v1/feeds/:id - Delete feed
    else if (req.method === "DELETE" && feedId) {
      const { error: deleteError } = await supabase.from("feeds").delete().eq("id", feedId).eq("user_id", user.id)

      if (deleteError) throw deleteError

      response = successResponse({ message: "Feed deleted successfully" })
    }

    // Method not allowed
    else {
      response = errorResponse("Method not allowed", 405, "METHOD_NOT_ALLOWED")
      statusCode = 405
    }

    // Log API usage
    const responseTime = Date.now() - startTime
    await logApiUsage(user, "/api/v1/feeds", req.method, statusCode, responseTime, req)

    // Add rate limit headers
    const headers = new Headers(response.headers)
    addRateLimitHeaders(headers, rateLimit)

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error: any) {
    console.error("API v1 feeds error:", error)
    return errorResponse(error.message || "Internal server error", 500)
  }
})

