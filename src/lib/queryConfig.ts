/**
 * React Query tuning for heavy list endpoints (see main.tsx global defaults).
 * - staleTime: treat data as fresh → no background refetch while navigating.
 * - gcTime: keep inactive cache longer than the default 5m so quick round-trips
 *   (e.g. Articles → Explore → Articles) still hit memory without refetching.
 */
export const LIST_STALE_MS = 5 * 60 * 1000
export const LIST_GC_MS = 30 * 60 * 1000
