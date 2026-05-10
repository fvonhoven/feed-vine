import { franc } from "npm:franc-min@6.2.0"

const MAX_SAMPLE = 4000
const MIN_CHARS = 12

function stripForDetect(htmlOrText: string): string {
  return htmlOrText
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** CJK unified ideographs — Chinese & Japanese kanji (English‑primary surfaces exclude these). */
export function containsHanScript(text: string): boolean {
  return /\p{Script=Han}/u.test(text)
}

function combinedSample(title: string, description: string | null, content?: string | null): string {
  return [title?.trim() || "", stripForDetect(description || ""), stripForDetect(content || "")]
    .filter(Boolean)
    .join("\n")
}

/**
 * ISO 639-3 language code (franc-min), or "und" when text is too short / unknown.
 */
export function detectArticleLanguage(title: string, description: string | null, content?: string | null): string {
  const text = combinedSample(title, description, content).trim()
  if (containsHanScript(text)) {
    const slice = text.slice(0, MAX_SAMPLE)
    return slice.length >= MIN_CHARS ? franc(slice) : "cmn"
  }
  if (text.length < MIN_CHARS) return "und"
  return franc(text.slice(0, MAX_SAMPLE))
}

const ENGLISH_PRIMARY_CODES = new Set(["eng", "und"])

/** Feeds / digest / public collection: English or unknown Latin-only short text; never CJK body/title. */
export function passesEnglishPrimaryArticle(
  persistedLanguage: string | null | undefined,
  title: string,
  description: string | null,
  content?: string | null,
): boolean {
  const sample = combinedSample(title, description, content)
  if (containsHanScript(sample)) return false

  const p = persistedLanguage?.trim().toLowerCase()
  if (p) return ENGLISH_PRIMARY_CODES.has(p)

  const t = sample.trim()
  if (t.length < MIN_CHARS) return true

  return ENGLISH_PRIMARY_CODES.has(franc(t.slice(0, MAX_SAMPLE)))
}
