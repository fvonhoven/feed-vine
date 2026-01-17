/**
 * Standard API Response Utilities
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    [key: string]: any
  }
}

/**
 * Create a successful JSON response
 */
export function successResponse<T>(data: T, meta?: any, status = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  }

  if (meta) {
    response.meta = meta
  }

  return new Response(JSON.stringify(response, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

/**
 * Create an error JSON response
 */
export function errorResponse(message: string, status = 400, code?: string, details?: any): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
      details,
    },
  }

  return new Response(JSON.stringify(response, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

/**
 * Handle CORS preflight requests
 */
export function corsPreflightResponse(): Response {
  return new Response("ok", {
    headers: corsHeaders,
  })
}

/**
 * Parse pagination parameters from URL
 */
export function parsePaginationParams(url: URL): { page: number; limit: number; offset: number } {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(page: number, limit: number, total: number) {
  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(body: any, requiredFields: string[]): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(field => !body[field])

  if (missing.length > 0) {
    return { valid: false, missing }
  }

  return { valid: true }
}

/**
 * Parse and validate JSON request body
 */
export async function parseJsonBody<T = any>(req: Request): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const body = await req.json()
    return { success: true, data: body }
  } catch (error) {
    return {
      success: false,
      error: "Invalid JSON in request body",
    }
  }
}

/**
 * Get CORS headers
 */
export function getCorsHeaders(): Record<string, string> {
  return corsHeaders
}

