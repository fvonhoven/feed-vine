import { franc } from "franc-min"

/** Match PostgREST `.or(...)`: hide rows whose language column is explicitly non-English (ISO 639-3). */
export const ARTICLE_LANGUAGE_SUPABASE_OR = "language.is.null,language.eq.eng,language.eq.und"

const FRANC_ALLOWED = new Set(["eng", "und"])
const MIN_CHARS = 12
const MAX_SAMPLE = 4000

/** CJK unified ideographs — keep client filter aligned with edge `detectLanguage.ts`. */
function containsHanScript(text: string): boolean {
  return /\p{Script=Han}/u.test(text)
}

/** Plain text snippet for franc (strip HTML-ish noise). */
function sampleForFranc(htmlOrText: string | null | undefined): string {
  if (!htmlOrText) return ""
  return htmlOrText
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export type ArticleLanguageFields = {
  title: string
  description?: string | null
  content?: string | null
  language?: string | null
}

/**
 * English-primary feed UX: drop CJK (Han script), reject persisted non‑English ISO 639-3 codes,
 * then franc on title+description+content when `language` is unset.
 */
export function passesEnglishPrimaryArticle(a: ArticleLanguageFields): boolean {
  const sample = [(a.title || "").trim(), sampleForFranc(a.description), sampleForFranc(a.content)]
    .filter(Boolean)
    .join("\n")

  if (containsHanScript(sample)) return false

  const raw = (a.language ?? "").trim().toLowerCase()
  if (raw) return FRANC_ALLOWED.has(raw)

  const t = sample.trim()
  if (t.length < MIN_CHARS) return true
  return FRANC_ALLOWED.has(franc(t.slice(0, MAX_SAMPLE)))
}

export function filterEnglishPrimaryArticles<T extends ArticleLanguageFields>(items: T[]): T[] {
  return items.filter(passesEnglishPrimaryArticle)
}
