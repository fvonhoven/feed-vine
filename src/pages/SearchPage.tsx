import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import { escapeFilterValue } from "../lib/urlUtils"
import type { ArticleWithStatus, Feed } from "../types/database"
import ArticleCard from "../components/ArticleCard"
import toast from "react-hot-toast"

export default function SearchPage() {
  const [keyword, setKeyword] = useState("")
  const [submittedKeyword, setSubmittedKeyword] = useState("")
  const [selectedFeedId, setSelectedFeedId] = useState("")
  const [dateRange, setDateRange] = useState("all")
  const queryClient = useQueryClient()

  const { data: feeds } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      if (isDemoMode) return []
      const { data, error } = await supabase.from("feeds").select("id, title").order("title")
      if (error) throw error
      return data as Pick<Feed, "id" | "title">[]
    },
  })

  const { data: articles, isLoading } = useQuery({
    queryKey: ["search-articles", submittedKeyword, selectedFeedId, dateRange],
    enabled: submittedKeyword.length > 0,
    queryFn: async () => {
      if (isDemoMode) return []

      const escaped = escapeFilterValue(submittedKeyword)
      let query = supabase
        .from("articles")
        .select(`*, feed:feeds(title, url), user_article:user_articles!left(is_read, is_saved)`)
        .or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%,content.ilike.%${escaped}%`)
        .order("published_at", { ascending: false })
        .limit(200)

      if (selectedFeedId) query = query.eq("feed_id", selectedFeedId)

      if (dateRange !== "all") {
        const startDate = new Date()
        if (dateRange === "24h") startDate.setHours(startDate.getHours() - 24)
        else if (dateRange === "week") startDate.setDate(startDate.getDate() - 7)
        else if (dateRange === "month") startDate.setMonth(startDate.getMonth() - 1)
        query = query.gte("published_at", startDate.toISOString())
      }

      const { data, error } = await query
      if (error) throw error

      return (data || []).map(article => ({
        ...article,
        user_article: Array.isArray(article.user_article) && article.user_article.length > 0 ? article.user_article[0] : null,
      })) as ArticleWithStatus[]
    },
  })

  const toggleReadMutation = useMutation({
    mutationFn: async ({ articleId, isRead }: { articleId: string; isRead: boolean }) => {
      if (isDemoMode) return { articleId, isRead }
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("user_articles")
        .upsert(
          { user_id: user.user.id, article_id: articleId, is_read: isRead, read_at: isRead ? new Date().toISOString() : null },
          { onConflict: "user_id,article_id" },
        )
      if (error) throw error
      return { articleId, isRead }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["search-articles"] }),
  })

  const toggleSaveMutation = useMutation({
    mutationFn: async ({ articleId, isSaved }: { articleId: string; isSaved: boolean }) => {
      if (isDemoMode) {
        toast.success(isSaved ? "Article saved!" : "Article removed from saved")
        return { articleId, isSaved }
      }
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("user_articles")
        .upsert(
          { user_id: user.user.id, article_id: articleId, is_saved: isSaved, saved_at: isSaved ? new Date().toISOString() : null },
          { onConflict: "user_id,article_id" },
        )
      if (error) throw error
      toast.success(isSaved ? "Article saved!" : "Article removed from saved")
      return { articleId, isSaved }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["search-articles"] }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedKeyword(keyword.trim())
  }

  return (
    <div className="px-0">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Search Articles</h1>

        {/* Search input */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Search titles, descriptions, and content..."
              className="w-full pl-9 pr-3 py-2.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm min-h-[44px]"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!keyword.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            Search
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedFeedId}
            onChange={e => setSelectedFeedId(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Feeds</option>
            {feeds?.map(f => (
              <option key={f.id} value={f.id}>
                {f.title}
              </option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="all">Any time</option>
            <option value="24h">Last 24 hours</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {!submittedKeyword ? (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Enter a search term and press Search</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : articles && articles.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {articles.length} result{articles.length === 1 ? "" : "s"} for{" "}
            <strong className="text-gray-900 dark:text-white">"{submittedKeyword}"</strong>
          </p>
          <div className="space-y-4">
            {articles.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onToggleRead={(id, isRead) => toggleReadMutation.mutate({ articleId: id, isRead })}
                onToggleSave={(id, isSaved) => toggleSaveMutation.mutate({ articleId: id, isSaved })}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No results</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No articles found for "{submittedKeyword}".</p>
        </div>
      )}
    </div>
  )
}
