/**
 * MailerLite API (connect.mailerlite.com) — shared fetch helpers.
 * Keep headers minimal (Bearer + JSON only). Custom User-Agent was reported to
 * trigger 403 + HTML from some CDNs; omitting it matches the previously working requests.
 * HTML body responses usually mean WAF/blocking, wrong endpoint, or bad auth — not always bad token.
 */

export const MAILERLITE_API_BASE = "https://connect.mailerlite.com/api"

/**
 * Reliable dashboard link: MailerLite’s SPA often 404s on `/campaigns/:id` and
 * `/campaigns/:id/edit/content` (routes change; API id may not match UI routes).
 * The Drafts tab URL is stable — users open the new draft by name (digest title).
 */
export function mailerLiteCampaignsDraftsUrl(): string {
  return "https://dashboard.mailerlite.com/campaigns/status/draft"
}

/** Same shape as the integration that worked before: no User-Agent. */
export function mailerLiteHeaders(apiToken: string): Record<string, string> {
  const token = String(apiToken ?? "").trim()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  }
}

function mailerLiteHtmlMessage(httpStatus: number): string {
  if (httpStatus === 401 || httpStatus === 403) {
    return (
      "MailerLite returned HTML (HTTP " +
      httpStatus +
      ") instead of a JSON API response. That often means the request was blocked, the token was rejected, or a Classic (old) API key was used. " +
      "Confirm MailerLite → Integrations → MailerLite API token, re-save it in FeedVine Settings, and retry. If it worked before, wait a few minutes or try again — temporary blocks happen."
    )
  }
  return `MailerLite returned an HTML error page (HTTP ${httpStatus}). Try again later or check MailerLite status.`
}

/** Parse JSON body; if MailerLite returns HTML (common on 403), return a structured error object. */
export async function readMailerLiteJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  const t = text.trim()
  if (!t) return {}

  const probe = t.slice(0, 64).toLowerCase().replace(/^\uFEFF/, "")
  if (probe.includes("<!doctype") || probe.startsWith("<html")) {
    return { message: mailerLiteHtmlMessage(res.status) }
  }

  try {
    return JSON.parse(t) as Record<string, unknown>
  } catch {
    return {
      message: `MailerLite sent a non-JSON response (HTTP ${res.status}): ${t.slice(0, 160)}`,
    }
  }
}

export function mailerLiteTopLevelMessage(data: Record<string, unknown>): string {
  const top = data.message
  if (typeof top === "string" && top.trim()) return top
  const errors = data.errors
  if (errors && typeof errors === "object" && errors !== null) {
    const parts: string[] = []
    for (const v of Object.values(errors as Record<string, unknown>)) {
      if (Array.isArray(v)) parts.push(v.map(String).join(" "))
      else if (typeof v === "object" && v !== null) parts.push(JSON.stringify(v))
      else if (v != null) parts.push(String(v))
    }
    const joined = parts.join(" ").trim()
    if (joined) return joined
  }
  return "MailerLite API error"
}
