/**
 * API Authentication Middleware
 * Validates API keys and loads user context
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface AuthenticatedUser {
  id: string
  email: string
  plan_id: string
  api_key_id: string
}

export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  statusCode?: number
}

/**
 * Validate API key and return user context
 */
export async function authenticateApiKey(apiKey: string): Promise<AuthResult> {
  if (!apiKey) {
    return {
      success: false,
      error: "Missing API key. Include 'Authorization: Bearer YOUR_API_KEY' header.",
      statusCode: 401,
    }
  }

  // API keys should start with sk_live_ or sk_test_
  if (!apiKey.startsWith("sk_live_") && !apiKey.startsWith("sk_test_")) {
    return {
      success: false,
      error: "Invalid API key format. API keys should start with 'sk_live_' or 'sk_test_'.",
      statusCode: 401,
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Hash the API key to compare with stored hash
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")

    // Look up API key in database
    const { data: apiKeyRecord, error: keyError } = await supabase
      .from("api_keys")
      .select(
        `
        id,
        user_id,
        is_active,
        expires_at,
        users:user_id (
          id,
          email
        )
      `,
      )
      .eq("key_hash", keyHash)
      .single()

    if (keyError || !apiKeyRecord) {
      return {
        success: false,
        error: "Invalid API key.",
        statusCode: 401,
      }
    }

    // Check if key is active
    if (!apiKeyRecord.is_active) {
      return {
        success: false,
        error: "API key has been revoked.",
        statusCode: 401,
      }
    }

    // Check if key is expired
    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      return {
        success: false,
        error: "API key has expired.",
        statusCode: 401,
      }
    }

    // Get user's subscription/plan
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", apiKeyRecord.user_id)
      .eq("status", "active")
      .single()

    const planId = subscription?.plan_id || "free"

    // Check if user has API access (Premium plan only)
    if (planId !== "premium") {
      return {
        success: false,
        error: "API access requires Premium plan. Upgrade at https://feedvine.app/pricing",
        statusCode: 403,
      }
    }

    // Update last_used_at timestamp
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyRecord.id)

    return {
      success: true,
      user: {
        id: apiKeyRecord.user_id,
        email: (apiKeyRecord.users as any).email,
        plan_id: planId,
        api_key_id: apiKeyRecord.id,
      },
    }
  } catch (error) {
    console.error("API authentication error:", error)
    return {
      success: false,
      error: "Internal server error during authentication.",
      statusCode: 500,
    }
  }
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return null

  // Support both "Bearer TOKEN" and just "TOKEN"
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7)
  }

  return authHeader
}

