/**
 * API v1 - Categories Endpoints
 * CRUD operations for categories
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
    const rateLimit = await checkRateLimit(user, "/api/v1/categories")

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
    const categoryId = pathParts[3]

    let response: Response
    let statusCode = 200

    // GET /api/v1/categories - List all categories
    if (req.method === "GET" && !categoryId) {
      const { data: categories, error } = await supabase.from("categories").select("id, name, color, created_at").eq("user_id", user.id).order("name")

      if (error) throw error
      response = successResponse(categories)
    }

    // GET /api/v1/categories/:id - Get specific category
    else if (req.method === "GET" && categoryId) {
      const { data: category, error } = await supabase.from("categories").select("id, name, color, created_at").eq("id", categoryId).eq("user_id", user.id).single()

      if (error || !category) {
        response = errorResponse("Category not found", 404)
        statusCode = 404
      } else {
        response = successResponse(category)
      }
    }

    // POST /api/v1/categories - Create new category
    else if (req.method === "POST" && !categoryId) {
      const { success: parseSuccess, data: body, error: parseError } = await parseJsonBody(req)

      if (!parseSuccess) {
        response = errorResponse(parseError || "Invalid request body", 400)
        statusCode = 400
      } else {
        const validation = validateRequiredFields(body, ["name"])
        if (!validation.valid) {
          response = errorResponse(`Missing required fields: ${validation.missing?.join(", ")}`, 400)
          statusCode = 400
        } else {
          const { data: newCategory, error: insertError } = await supabase
            .from("categories")
            .insert({
              user_id: user.id,
              name: body.name,
              color: body.color || "#3B82F6",
            })
            .select("id, name, color, created_at")
            .single()

          if (insertError) {
            if (insertError.code === "23505") {
              response = errorResponse("Category name already exists", 409)
              statusCode = 409
            } else {
              throw insertError
            }
          } else {
            response = successResponse(newCategory, null, 201)
            statusCode = 201
          }
        }
      }
    }

    // PATCH /api/v1/categories/:id - Update category
    else if (req.method === "PATCH" && categoryId) {
      const { success: parseSuccess, data: body } = await parseJsonBody(req)

      if (!parseSuccess) {
        response = errorResponse("Invalid request body", 400)
        statusCode = 400
      } else {
        const updates: any = {}
        if (body.name) updates.name = body.name
        if (body.color) updates.color = body.color

        const { data: updatedCategory, error: updateError } = await supabase
          .from("categories")
          .update(updates)
          .eq("id", categoryId)
          .eq("user_id", user.id)
          .select("id, name, color, created_at")
          .single()

        if (updateError) throw updateError
        response = successResponse(updatedCategory)
      }
    }

    // DELETE /api/v1/categories/:id - Delete category
    else if (req.method === "DELETE" && categoryId) {
      const { error: deleteError } = await supabase.from("categories").delete().eq("id", categoryId).eq("user_id", user.id)

      if (deleteError) throw deleteError
      response = successResponse({ message: "Category deleted successfully" })
    }

    // Method not allowed
    else {
      response = errorResponse("Method not allowed", 405)
      statusCode = 405
    }

    const responseTime = Date.now() - startTime
    await logApiUsage(user, "/api/v1/categories", req.method, statusCode, responseTime, req)

    const headers = new Headers(response.headers)
    addRateLimitHeaders(headers, rateLimit)

    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error: any) {
    console.error("API v1 categories error:", error)
    return errorResponse(error.message || "Internal server error", 500)
  }
})

