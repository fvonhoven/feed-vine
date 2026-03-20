/**
 * Shared security utilities for Edge Functions
 * @soc2 CC6.7 - Input validation, URL validation
 */

/** Allowed redirect origins for open-redirect protection */
const ALLOWED_ORIGINS = [
  "https://feedvine.app",
  "https://www.feedvine.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
]

/**
 * Validate URL is http/https and not internal/private
 * Prevents SSRF and javascript: URL injection
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!["http:", "https:"].includes(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (host === "localhost" || host === "127.0.0.1") return false
    if (host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.")) return false
    if (host === "169.254.169.254" || host.endsWith(".internal")) return false
    return true
  } catch {
    return false
  }
}

/**
 * Escape HTML special chars to prevent XSS
 */
export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Escape PostgREST filter value to prevent SQL injection in .or() / .ilike()
 */
export function escapeFilterValue(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .slice(0, 500)
}

/**
 * Validate returnUrl against allowlist; returns origin if valid (for building redirect URLs)
 */
export function validateReturnUrl(url: string | undefined): string | null {
  if (!url || typeof url !== "string") return null
  try {
    const u = new URL(url)
    const origin = `${u.protocol}//${u.hostname}${u.port ? ":" + u.port : ""}`
    if (ALLOWED_ORIGINS.includes(origin)) return origin
    return null
  } catch {
    return null
  }
}

/**
 * Check if request is from cron or internal (service key / CRON_SECRET)
 */
export function isCronOrServiceAuth(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  const authHeader = req.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ") && serviceKey) {
    const token = authHeader.slice(7)
    if (token === serviceKey) return true
  }

  const cronHeader = req.headers.get("X-Cron-Secret")
  if (cronSecret && cronHeader === cronSecret) return true

  try {
    const url = new URL(req.url)
    const secretParam = url.searchParams.get("secret")
    if (cronSecret && secretParam === cronSecret) return true
  } catch {
    // ignore
  }

  return false
}
