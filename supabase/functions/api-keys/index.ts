/**
 * API Key Management Edge Function
 * Handles creating, listing, and revoking API keys
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsPreflightResponse, successResponse, errorResponse, parseJsonBody, validateRequiredFields } from "../_shared/apiResponse.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async req => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return corsPreflightResponse()
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse("Unauthorized", 401)
    }

    // Check if user has Premium plan (required for API access)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: subscription } = await supabaseAdmin.from("subscriptions").select("plan_id").eq("user_id", user.id).eq("status", "active").single()

    const planId = subscription?.plan_id || "free"

    if (planId !== "premium") {
      return errorResponse("API access requires Premium plan. Upgrade at https://feedvine.app/pricing", 403, "PREMIUM_REQUIRED")
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split("/").filter(Boolean)

    // GET /api-keys - List all API keys for user
    if (req.method === "GET" && pathParts.length === 1) {
      const { data: apiKeys, error } = await supabaseAdmin
        .from("api_keys")
        .select("id, name, key_prefix, last_used_at, created_at, expires_at, is_active")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      return successResponse(apiKeys)
    }

    // POST /api-keys - Create new API key
    if (req.method === "POST" && pathParts.length === 1) {
      const { success: parseSuccess, data: body, error: parseError } = await parseJsonBody(req)

      if (!parseSuccess) {
        return errorResponse(parseError || "Invalid request body", 400)
      }

      const validation = validateRequiredFields(body, ["name"])
      if (!validation.valid) {
        return errorResponse(`Missing required fields: ${validation.missing?.join(", ")}`, 400, "VALIDATION_ERROR")
      }

      // Check if user already has 5 API keys (limit)
      const { data: existingKeys } = await supabaseAdmin.from("api_keys").select("id").eq("user_id", user.id).eq("is_active", true)

      if (existingKeys && existingKeys.length >= 5) {
        return errorResponse("Maximum of 5 active API keys allowed. Please revoke an existing key first.", 400, "KEY_LIMIT_EXCEEDED")
      }

      // Generate API key
      const apiKey = `sk_live_${crypto.randomUUID().replace(/-/g, "")}`
      const keyPrefix = apiKey.substring(0, 16) + "..."

      // Hash the API key
      const encoder = new TextEncoder()
      const data = encoder.encode(apiKey)
      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")

      // Save to database
      const { data: newKey, error: insertError } = await supabaseAdmin
        .from("api_keys")
        .insert({
          user_id: user.id,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          name: body.name,
          expires_at: body.expires_at || null,
        })
        .select("id, name, key_prefix, created_at, expires_at, is_active")
        .single()

      if (insertError) throw insertError

      // Return the full API key ONCE (it will never be shown again)
      return successResponse(
        {
          ...newKey,
          api_key: apiKey,
          warning: "Save this API key now. You won't be able to see it again!",
        },
        null,
        201,
      )
    }

    // DELETE /api-keys/:id - Revoke/delete API key
    if (req.method === "DELETE" && pathParts.length === 2) {
      const keyId = pathParts[1]

      const { error: deleteError } = await supabaseAdmin.from("api_keys").update({ is_active: false }).eq("id", keyId).eq("user_id", user.id)

      if (deleteError) throw deleteError

      return successResponse({ message: "API key revoked successfully" })
    }

    return errorResponse("Not found", 404)
  } catch (error: any) {
    console.error("API keys error:", error)
    return errorResponse(error.message || "Internal server error", 500)
  }
})

