/**
 * Turn RSS/HTML snippets into plain text for digests.
 * Feeds often ship HTML entity–encoded markup (&lt;span&gt;...); stripping tags
 * before decoding leaves entity soup that decodes back into visible tags.
 */

/** Escape for HTML email bodies (attribute/text nodes). */
export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function decodeHtmlEntities(s: string): string {
  let out = s
  for (let i = 0; i < 5; i++) {
    const prev = out
    out = out
      .replace(/&nbsp;/gi, " ")
      .replace(/&#(\d+);/g, (m, n) => {
        const code = parseInt(n, 10)
        return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
      })
      .replace(/&#x([0-9a-f]+);/gi, (m, h) => {
        const code = parseInt(h, 16)
        return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
      })
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
    if (out === prev) break
  }
  return out
}

/** Turn block/line breaks in source HTML into newlines before tags are stripped. */
function injectStructuralNewlines(html: string): string {
  let s = html
  s = s.replace(/<br\s*\/?>/gi, "\n")
  s = s.replace(/<hr\s*\/?>/gi, "\n")
  s = s.replace(/<\/(p|div|h[1-6]|li|blockquote|section|article|header|footer|pre|tr|table|thead|tbody|tfoot|ul|ol)>/gi, "\n")
  s = s.replace(/<\/(dl|dd|dt)>/gi, "\n")
  s = s.replace(/<p[^>]*>/gi, "")
  s = s.replace(/<div[^>]*>/gi, "")
  s = s.replace(/<li[^>]*>/gi, "• ")
  return s
}

export function htmlToPlainText(html: string): string {
  if (!html) return ""
  let s = html.trim()
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
  s = s.replace(/<!--[\s\S]*?-->/g, "")
  s = decodeHtmlEntities(s)
  s = injectStructuralNewlines(s)
  let prev = ""
  while (s !== prev) {
    prev = s
    s = s.replace(/<[^>]*>/g, "")
  }
  s = decodeHtmlEntities(s)
  s = s.replace(/[ \t]+\r?\n/g, "\n")
  s = s.replace(/\n{3,}/g, "\n\n")
  return s.trim()
}

/**
 * Trim plain text for storage/UI at a word or paragraph boundary.
 * Used for digest history so RSS full-text descriptions do not blow up the DB.
 */
export function truncatePlainText(plain: string, maxChars: number): string {
  if (!plain || plain.length <= maxChars) return plain
  const slice = plain.slice(0, maxChars)
  const lastPara = slice.lastIndexOf("\n\n")
  const lastSentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "))
  const lastSpace = slice.lastIndexOf(" ")
  const cut =
    lastPara > maxChars * 0.45
      ? lastPara
      : lastSentence > maxChars * 0.35
        ? lastSentence + 1
        : lastSpace > maxChars * 0.28
          ? lastSpace
          : maxChars
  return slice.slice(0, cut).trimEnd() + "…"
}

/**
 * Default per-article body length for email/MailerLite HTML. RSS `description` is often full post text;
 * the digest should be a teaser (title + link carry the rest).
 */
export const DEFAULT_DIGEST_EMAIL_ARTICLE_CHARS = 520

function truncateDigestExcerpt(plain: string, maxChars: number): string {
  if (plain.length <= maxChars) return plain
  const slice = plain.slice(0, maxChars)
  const lastPara = slice.lastIndexOf("\n\n")
  const lastSentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("。\n"))
  const lastSpace = slice.lastIndexOf(" ")
  const cut =
    lastPara > maxChars * 0.55
      ? lastPara
      : lastSentence > maxChars * 0.5
        ? lastSentence + 1
        : lastSpace > maxChars * 0.45
          ? lastSpace
          : maxChars
  return slice.slice(0, cut).trimEnd() + "…"
}

function blockLooksLikeCode(block: string): boolean {
  const lines = block.split("\n").filter(l => l.trim().length > 0)
  if (lines.length < 8) return false
  let score = 0
  for (const line of lines) {
    const t = line.trimStart()
    if (/^\s{4,}|\t/.test(line)) score += 2
    if (/^(def |class |import |from |async |await |#|\/\/|@|\$|\)|;(\s|$)|{|}$)/.test(t)) score += 1
    if (/[:=]\s*(\[|\{|\()/.test(line) || /(->|=>|\+\+|--)/.test(line)) score += 1
  }
  return score >= Math.min(lines.length * 0.35, 18)
}

/**
 * Plain text → safe HTML: paragraph breaks, single newlines as &lt;br&gt;, optional &lt;pre&gt; for dense code.
 * @param maxTotalChars — cap for one article body (default newsletter teaser length).
 */
export function plainTextToDigestBodyHtml(
  plain: string,
  maxTotalChars: number = DEFAULT_DIGEST_EMAIL_ARTICLE_CHARS,
): string {
  const text = truncateDigestExcerpt(plain.trim(), maxTotalChars)
  if (!text) return ""

  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const parts: string[] = []

  for (const block of blocks) {
    if (blockLooksLikeCode(block)) {
      parts.push(
        `<pre style="margin:0 0 1em;padding:12px 14px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;line-height:1.45;overflow-x:auto;color:#27272a;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace">${escapeHtml(block)}</pre>`,
      )
    } else {
      const inner = escapeHtml(block).replace(/\r?\n/g, "<br/>")
      parts.push(`<p style="margin:0 0 1em;color:#444;line-height:1.65;">${inner}</p>`)
    }
  }
  return parts.join("\n")
}

/** Outer layout: readable line length in Gmail / MailerLite. */
export function wrapDigestEmail(inner: string): string {
  return `<div style="max-width:600px;margin:0 auto;padding:12px 20px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;color:#333;">${inner}</div>`
}
