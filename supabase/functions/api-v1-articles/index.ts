/**
 * API v1 - Articles Endpoints
 * Read operations and status updates for articles
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
    const rateLimit = await checkRateLimit(user, "/api/v1/articles")
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
    const articleId = pathParts[3] // /api/v1/articles/:id
    const action = pathParts[4] // /api/v1/articles/:id/read or /save

    let response: Response
    let statusCode = 200

    // GET /api/v1/articles - List articles with filters
    if (req.method === "GET" && !articleId) {
      const { page, limit, offset } = parsePaginationParams(url)
      const feedId = url.searchParams.get("feed_id")
      const unreadOnly = url.searchParams.get("unread") === "true"
      const savedOnly = url.searchParams.get("saved") === "true"
      const search = url.searchParams.get("search")

      // First, get user's feed IDs
      const { data: userFeeds } = await supabase.from("feeds").select("id").eq("user_id", user.id)

      if (!userFeeds || userFeeds.length === 0) {
        response = successResponse([], createPaginationMeta(page, limit, 0))
      } else {
        const feedIds = userFeeds.map(f => f.id)

        let query = supabase
          .from("articles")
          .select(
            `
            id,
            title,
            url,
            description,
            content,
            author,
            published_at,
            created_at,
            feed:feeds(id, title, url),
            user_article:user_articles(is_read, is_saved, read_at, saved_at)
          `,
            { count: "exact" },
          )
          .in("feed_id", feedIds)
          .order("published_at", { ascending: false })

        if (feedId) {
          query = query.eq("feed_id", feedId)
        }

        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data: articles, error, count } = await query.range(offset, offset + limit - 1)

        if (error) throw error

        // Filter by read/saved status (client-side since it's in a joined table)
        let filteredArticles = articles || []
        if (unreadOnly) {
          filteredArticles = filteredArticles.filter(a => !a.user_article || !a.user_article.is_read)
        }
        if (savedOnly) {
          filteredArticles = filteredArticles.filter(a => a.user_article && a.user_article.is_saved)
        }

        response = successResponse(filteredArticles, createPaginationMeta(page, limit, count || 0))
      }
    }

    // GET /api/v1/articles/:id - Get specific article
    else if (req.method === "GET" && articleId && !action) {
      // Verify article belongs to user's feed
      const { data: article, error } = await supabase
        .from("articles")
        .select(
          `
          id,
          title,
          url,
          description,
          content,
          author,
          published_at,
          created_at,
          feed:feeds!inner(id, title, url, user_id),
          user_article:user_articles(is_read, is_saved, read_at, saved_at)
        `,
        )
        .eq("id", articleId)
        .eq("feeds.user_id", user.id)
        .single()

      if (error || !article) {
        response = errorResponse("Article not found", 404, "NOT_FOUND")
        statusCode = 404
      } else {
        response = successResponse(article)
      }
    }

    // PATCH /api/v1/articles/:id/read - Mark as read/unread
    else if (req.method === "PATCH" && articleId && action === "read") {
      const { success: parseSuccess, data: body } = await parseJsonBody(req)
      const isRead = body?.is_read !== false // Default to true

      // Upsert user_article record
      const { error: upsertError } = await supabase.from("user_articles").upsert(
        {
          user_id: user.id,
          article_id: articleId,
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
        },
        {
          onConflict: "user_id,article_id",
        },
      )

      if (upsertError) throw upsertError

      response = successResponse({ message: `Article marked as ${isRead ? "read" : "unread"}`, is_read: isRead })
    }

    // PATCH /api/v1/articles/:id/save - Save/unsave article
    else if (req.method === "PATCH" && articleId && action === "save") {
      const { success: parseSuccess, data: body } = await parseJsonBody(req)
      const isSaved = body?.is_saved !== false // Default to true

      // Upsert user_article record
      const { error: upsertError } = await supabase.from("user_articles").upsert(
        {
          user_id: user.id,
          article_id: articleId,
          is_saved: isSaved,
          saved_at: isSaved ? new Date().toISOString() : null,
        },
        {
          onConflict: "user_id,article_id",
        },
      )

      if (upsertError) throw upsertError

      response = successResponse({ message: `Article ${isSaved ? "saved" : "unsaved"}`, is_saved: isSaved })
    }

    // Method not allowed
    else {
      response = errorResponse("Method not allowed", 405, "METHOD_NOT_ALLOWED")
      statusCode = 405
    }

    // Log API usage
    const responseTime = Date.now() - startTime
    await logApiUsage(user, "/api/v1/articles", req.method, statusCode, responseTime, req)

    // Add rate limit headers
    const headers = new Headers(response.headers)
    addRateLimitHeaders(headers, rateLimit)

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error: any) {
    console.error("API v1 articles error:", error)
    return errorResponse(error.message || "Internal server error", 500)
  }
})

