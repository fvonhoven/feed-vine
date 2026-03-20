/**
 * URL validation and filter escaping utilities for XSS/SSRF/SQL injection prevention
 */

/**
 * Escape PostgREST filter value to prevent injection in .or() / .ilike()
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
 * Returns true if URL is http or https and not internal/private
 */
export function isSafeUrl(url: string): boolean {
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
