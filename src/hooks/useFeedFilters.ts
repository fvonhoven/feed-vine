import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { FeedFilter, ArticleWithStatus } from "../types/database"

export function useFeedFilters() {
  const queryClient = useQueryClient()

  const { data: filters = [] } = useQuery({
    queryKey: ["feed-filters"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("feed_filters")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("is_active", true)
      if (error) throw error
      return data as FeedFilter[]
    },
  })

  /** Returns include/exclude filter rows scoped to a specific feed (feed-level only, not global). */
  const getFiltersForFeed = (feedId: string) => ({
    include: filters.filter(f => f.feed_id === feedId && f.filter_type === "include"),
    exclude: filters.filter(f => f.feed_id === feedId && f.filter_type === "exclude"),
  })

  const addKeywordMutation = useMutation({
    mutationFn: async ({
      feedId,
      filterType,
      keyword,
    }: {
      feedId: string | null
      filterType: "include" | "exclude"
      keyword: string
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("Not authenticated")

      const trimmed = keyword.trim().toLowerCase()
      if (!trimmed) return

      const existing = filters.find(f => f.feed_id === feedId && f.filter_type === filterType)

      if (existing) {
        if (existing.keywords.includes(trimmed)) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("feed_filters")
          .update({ keywords: [...existing.keywords, trimmed] })
          .eq("id", existing.id)
        if (error) throw error
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("feed_filters").insert({
          user_id: userData.user.id,
          feed_id: feedId,
          filter_type: filterType,
          keywords: [trimmed],
        })
        if (error) throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-filters"] }),
  })

  const removeKeywordMutation = useMutation({
    mutationFn: async ({ filterId, keyword }: { filterId: string; keyword: string }) => {
      const filter = filters.find(f => f.id === filterId)
      if (!filter) return

      const newKeywords = filter.keywords.filter(kw => kw !== keyword)

      if (newKeywords.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("feed_filters").delete().eq("id", filterId)
        if (error) throw error
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("feed_filters")
          .update({ keywords: newKeywords })
          .eq("id", filterId)
        if (error) throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-filters"] }),
  })

  return {
    filters,
    getFiltersForFeed,
    addKeyword: addKeywordMutation.mutate,
    removeKeyword: removeKeywordMutation.mutate,
    isAddingKeyword: addKeywordMutation.isPending,
  }
}

/**
 * Client-side filtering: applies active feed_filters rules to an article list.
 * Exclude rules run first; if any keyword matches, article is hidden.
 * Include rules (per-feed): if rules exist, article must match at least one keyword.
 * Global filters (feed_id === null) apply to all feeds.
 */
export function applyFeedFilters(articles: ArticleWithStatus[], filters: FeedFilter[]): ArticleWithStatus[] {
  const activeFilters = filters.filter(f => f.is_active && f.keywords.length > 0)
  if (activeFilters.length === 0) return articles

  return articles.filter(article => {
    const relevant = activeFilters.filter(f => f.feed_id === article.feed_id || f.feed_id === null)
    if (relevant.length === 0) return true

    const excludes = relevant.filter(f => f.filter_type === "exclude")
    const includes = relevant.filter(f => f.filter_type === "include")

    const text = `${article.title} ${article.description ?? ""} ${article.content ?? ""}`.toLowerCase()

    // Exclude wins immediately
    for (const rule of excludes) {
      if (rule.keywords.some(kw => text.includes(kw))) return false
    }

    // Include: article must match at least one keyword from any include rule
    if (includes.length > 0) {
      const matchesAny = includes.some(rule => rule.keywords.some(kw => text.includes(kw)))
      if (!matchesAny) return false
    }

    return true
  })
}

