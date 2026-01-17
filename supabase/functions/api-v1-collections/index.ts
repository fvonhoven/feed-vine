/**
 * API v1 - Collections Endpoints
 * CRUD operations for feed collections
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { authenticateApiKey, extractApiKey } from "../_shared/apiAuth.ts"
import { checkRateLimit, logApiUsage, addRateLimitHeaders } from "../_shared/rateLimit.ts"
import { corsPreflightResponse, successResponse, errorResponse, parseJsonBody, validateRequiredFields } from "../_shared/apiResponse.ts"

serve(async req => {
  const startTime = Date.now()

  if (req.method === "OPTIONS") {
    return corsPreflightResponse()
  }

  try {
    const apiKey = extractApiKey(req)
    if (!apiKey) {
      return errorResponse("Missing API key", 401)
    }

    const authResult = await authenticateApiKey(apiKey)
    if (!authResult.success) {
      return errorResponse(authResult.error || "Authentication failed", authResult.statusCode || 401)
    }

    const user = authResult.user!
    const rateLimit = await checkRateLimit(user, "/api/v1/collections")

    if (!rateLimit.allowed) {
      const response = errorResponse(rateLimit.error || "Rate limit exceeded", 429)
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
    const collectionId = pathParts[3]

    let response: Response
    let statusCode = 200

    // GET /api/v1/collections - List all collections
    if (req.method === "GET" && !collectionId) {
      const { data: collections, error } = await supabase
        .from("feed_collections")
        .select(
          `
          id,
          name,
          slug,
          description,
          is_public,
          output_format,
          created_at,
          sources:feed_collection_sources(
            feed:feeds(id, title, url)
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      response = successResponse(collections)
    }

    // GET /api/v1/collections/:id - Get specific collection
    else if (req.method === "GET" && collectionId) {
      const { data: collection, error } = await supabase
        .from("feed_collections")
        .select(
          `
          id,
          name,
          slug,
          description,
          is_public,
          output_format,
          created_at,
          sources:feed_collection_sources(
            feed:feeds(id, title, url)
          )
        `,
        )
        .eq("id", collectionId)
        .eq("user_id", user.id)
        .single()

      if (error || !collection) {
        response = errorResponse("Collection not found", 404)
        statusCode = 404
      } else {
        response = successResponse(collection)
      }
    }

    // POST /api/v1/collections - Create new collection
    else if (req.method === "POST" && !collectionId) {
      const { success: parseSuccess, data: body, error: parseError } = await parseJsonBody(req)

      if (!parseSuccess) {
        response = errorResponse(parseError || "Invalid request body", 400)
        statusCode = 400
      } else {
        const validation = validateRequiredFields(body, ["name", "slug"])
        if (!validation.valid) {
          response = errorResponse(`Missing required fields: ${validation.missing?.join(", ")}`, 400)
          statusCode = 400
        } else {
          const { data: newCollection, error: insertError } = await supabase
            .from("feed_collections")
            .insert({
              user_id: user.id,
              name: body.name,
              slug: body.slug,
              description: body.description || "",
              is_public: body.is_public !== false,
              output_format: body.output_format || "rss",
            })
            .select("id, name, slug, description, is_public, output_format, created_at")
            .single()

          if (insertError) {
            if (insertError.code === "23505") {
              response = errorResponse("Collection slug already exists", 409)
              statusCode = 409
            } else {
              throw insertError
            }
          } else {
            // Add feed sources if provided
            if (body.feed_ids && Array.isArray(body.feed_ids)) {
              const sources = body.feed_ids.map((feedId: string) => ({
                collection_id: newCollection.id,
                feed_id: feedId,
              }))

              await supabase.from("feed_collection_sources").insert(sources)
            }

            response = successResponse(newCollection, null, 201)
            statusCode = 201
          }
        }
      }
    }

    // DELETE /api/v1/collections/:id - Delete collection
    else if (req.method === "DELETE" && collectionId) {
      const { error: deleteError } = await supabase.from("feed_collections").delete().eq("id", collectionId).eq("user_id", user.id)

      if (deleteError) throw deleteError
      response = successResponse({ message: "Collection deleted successfully" })
    }

    // Method not allowed
    else {
      response = errorResponse("Method not allowed", 405)
      statusCode = 405
    }

    const responseTime = Date.now() - startTime
    await logApiUsage(user, "/api/v1/collections", req.method, statusCode, responseTime, req)

    const headers = new Headers(response.headers)
    addRateLimitHeaders(headers, rateLimit)

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error: any) {
    console.error("API v1 collections error:", error)
    return errorResponse(error.message || "Internal server error", 500)
  }
})

