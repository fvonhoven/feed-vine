import type { Query } from "@tanstack/react-query"

/** First segment of query keys we persist to localStorage (article lists + related feed/collection rows). */
const PERSISTED_QUERY_ROOTS = new Set([
  "articles",
  "feed-articles",
  "feed",
  "collection-articles",
  "collection",
  "digest-articles",
  "saved-articles",
  "search-articles",
  "all-articles-for-export",
])

export function shouldPersistArticleRelatedQuery(query: Query): boolean {
  const root = query.queryKey[0]
  return typeof root === "string" && PERSISTED_QUERY_ROOTS.has(root)
}

/** Drop persisted snapshot if older than this (ms). */
export const PERSIST_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7

/** Bump if persisted JSON shape changes so clients discard old snapshots. */
export const PERSIST_QUERY_BUSTER = "v1"
