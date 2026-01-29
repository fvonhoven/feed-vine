import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { ArticleWithStatus, Feed } from "../types/database"
import ArticleCard from "../components/ArticleCard"
import FilterBar from "../components/FilterBar"
import toast from "react-hot-toast"
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts"
import { KeyboardShortcutsHelp } from "../components/KeyboardShortcutsHelp"
import { FaRegKeyboard } from "react-icons/fa"

export default function HomePage() {
  const [keyword, setKeyword] = useState("")
  const [selectedFeedId, setSelectedFeedId] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("all")
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0)
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const queryClient = useQueryClient()
  const articleRefs = useRef<(HTMLDivElement | null)[]>([])

  // Fetch all feeds for refresh all functionality
  const { data: feeds } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      if (isDemoMode) return []
      const { data, error } = await supabase.from("feeds").select("*").eq("status", "active")
      if (error) throw error
      return data as Feed[]
    },
  })

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", keyword, selectedFeedId, dateRange, showUnreadOnly],
    queryFn: async () => {
      // In demo mode, return empty array
      if (isDemoMode) {
        return []
      }

      // Real Supabase query with user_articles join
      // Use !left to make it a LEFT JOIN so we get articles even without user_articles records
      let query = supabase
        .from("articles")
        .select(
          `
          *,
          feed:feeds(title, url),
          user_article:user_articles!left(is_read, is_saved)
        `,
        )
        .order("published_at", { ascending: false })
        .limit(500)

      // Apply filters
      if (keyword) {
        query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%,content.ilike.%${keyword}%`)
      }

      if (selectedFeedId) {
        query = query.eq("feed_id", selectedFeedId)
      }

      if (showUnreadOnly) {
        query = query.eq("user_article.is_read", false)
      }

      if (dateRange !== "all") {
        const now = new Date()
        let startDate = new Date()

        switch (dateRange) {
          case "24h":
            startDate.setHours(now.getHours() - 24)
            break
          case "week":
            startDate.setDate(now.getDate() - 7)
            break
          case "month":
            startDate.setMonth(now.getMonth() - 1)
            break
        }

        query = query.gte("published_at", startDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      // Transform the data to match ArticleWithStatus type
      // Supabase returns user_article as an array, we need to convert it to a single object or null
      return (data || []).map(article => ({
        ...article,
        user_article: Array.isArray(article.user_article) && article.user_article.length > 0 ? article.user_article[0] : null,
      })) as ArticleWithStatus[]
    },
  })

  // Mutation to toggle read status
  const toggleReadMutation = useMutation({
    mutationFn: async ({ articleId, isRead }: { articleId: string; isRead: boolean }) => {
      if (isDemoMode) {
        // In demo mode, just update local state
        return { articleId, isRead }
      }

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not authenticated")

      const { error } = await supabase.from("user_articles").upsert(
        {
          user_id: user.user.id,
          article_id: articleId,
          is_read: isRead,
          read_at: isRead ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,article_id" },
      )

      if (error) throw error
      return { articleId, isRead }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] })
    },
  })

  // Mutation to toggle save status
  const toggleSaveMutation = useMutation({
    mutationFn: async ({ articleId, isSaved }: { articleId: string; isSaved: boolean }) => {
      if (isDemoMode) {
        toast.success(isSaved ? "Article saved!" : "Article removed from saved")
        return { articleId, isSaved }
      }

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not authenticated")

      const { error } = await supabase.from("user_articles").upsert(
        {
          user_id: user.user.id,
          article_id: articleId,
          is_saved: isSaved,
          saved_at: isSaved ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,article_id" },
      )

      if (error) throw error
      toast.success(isSaved ? "Article saved!" : "Article removed from saved")
      return { articleId, isSaved }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] })
    },
  })

  const handleToggleRead = (articleId: string, isRead: boolean) => {
    toggleReadMutation.mutate({ articleId, isRead })
  }

  const handleToggleSave = (articleId: string, isSaved: boolean) => {
    toggleSaveMutation.mutate({ articleId, isSaved })
  }

  // Scroll to selected article
  useEffect(() => {
    if (articleRefs.current[selectedArticleIndex]) {
      articleRefs.current[selectedArticleIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [selectedArticleIndex])

  // Keyboard shortcuts
  const shortcuts = useKeyboardShortcuts({
    shortcuts: [
      {
        key: "j",
        description: "Next article",
        action: () => {
          if (articles && selectedArticleIndex < articles.length - 1) {
            setSelectedArticleIndex(prev => prev + 1)
          }
        },
      },
      {
        key: "k",
        description: "Previous article",
        action: () => {
          if (selectedArticleIndex > 0) {
            setSelectedArticleIndex(prev => prev - 1)
          }
        },
      },
      {
        key: "m",
        description: "Mark as read/unread",
        action: () => {
          if (articles && articles[selectedArticleIndex]) {
            const article = articles[selectedArticleIndex]
            const isRead = article.user_article?.is_read || false
            handleToggleRead(article.id, !isRead)
          }
        },
      },
      {
        key: "s",
        description: "Save/unsave article",
        action: () => {
          if (articles && articles[selectedArticleIndex]) {
            const article = articles[selectedArticleIndex]
            const isSaved = article.user_article?.is_saved || false
            handleToggleSave(article.id, !isSaved)
          }
        },
      },
      {
        key: "o",
        description: "Open article",
        action: () => {
          if (articles && articles[selectedArticleIndex]) {
            window.open(articles[selectedArticleIndex].url, "_blank")
            handleToggleRead(articles[selectedArticleIndex].id, true)
          }
        },
      },
      {
        key: "u",
        description: "Toggle unread only",
        action: () => setShowUnreadOnly(prev => !prev),
      },
      {
        key: "?",
        description: "Show keyboard shortcuts",
        action: () => setShowShortcutsHelp(prev => !prev),
      },
      {
        key: "/",
        description: "Focus search",
        action: () => {
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
          searchInput?.focus()
        },
      },
    ],
  })

  const handleRefreshAllFeeds = async () => {
    if (isDemoMode) {
      toast.error("Demo mode: Connect Supabase to refresh feeds")
      return
    }

    if (!feeds || feeds.length === 0) {
      toast.error("No active feeds to refresh")
      return
    }

    setIsRefreshingAll(true)
    const toastId = toast.loading(`Refreshing ${feeds.length} feeds...`)

    try {
      // Call the edge function without parameters to refresh all feeds
      const { data, error } = await supabase.functions.invoke("fetch-rss")

      if (error) {
        throw new Error(error.message || "Failed to refresh feeds")
      }

      if (!data.success || !data.results) {
        throw new Error("Failed to refresh feeds")
      }

      // Count successes and failures
      const successCount = data.results.filter((r: any) => r.success).length
      const failureCount = data.results.length - successCount

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      queryClient.invalidateQueries({ queryKey: ["feeds"] })

      toast.dismiss(toastId)
      if (failureCount === 0) {
        toast.success(`Successfully refreshed all ${successCount} feeds!`)
      } else {
        toast.success(`Refreshed ${successCount} feeds. ${failureCount} failed.`)
      }
    } catch (error: any) {
      toast.dismiss(toastId)
      toast.error(error.message || "Failed to refresh feeds")
    } finally {
      setIsRefreshingAll(false)
    }
  }

  return (
    <div className="px-0">
      {showShortcutsHelp && <KeyboardShortcutsHelp shortcuts={shortcuts} onClose={() => setShowShortcutsHelp(false)} />}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">All Articles</h1>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {articles?.length || 0} articles
              {showUnreadOnly && " (unread only)"}
            </p>
          </div>
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors group flex-shrink-0"
            title="Keyboard shortcuts (?)"
          >
            <FaRegKeyboard className="w-5 h-5" />
            <span className="absolute -bottom-1 -right-1 px-1 text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600">
              ?
            </span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefreshAllFeeds}
            disabled={isRefreshingAll || isDemoMode}
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors min-h-[44px]"
            title="Refresh all feeds"
          >
            <svg className={`w-4 h-4 mr-1.5 sm:mr-2 ${isRefreshingAll ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden xs:inline">{isRefreshingAll ? "Refreshing..." : "Refresh All"}</span>
            <span className="xs:hidden">{isRefreshingAll ? "..." : "Refresh"}</span>
          </button>
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
              showUnreadOnly
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {showUnreadOnly ? "Show All" : "Unread Only"}
          </button>
        </div>
      </div>

      <FilterBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        selectedFeedId={selectedFeedId}
        onFeedChange={setSelectedFeedId}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : articles && articles.length > 0 ? (
        <div className="space-y-4">
          {articles.map((article, index) => (
            <div
              key={article.id}
              ref={el => (articleRefs.current[index] = el)}
              className={`transition-all ${selectedArticleIndex === index ? "ring-2 ring-primary-500 rounded-lg" : ""}`}
            >
              <ArticleCard article={article} onToggleRead={handleToggleRead} onToggleSave={handleToggleSave} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No articles</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {showUnreadOnly ? "You've read all your articles! 🎉" : "Get started by adding some RSS feeds."}
          </p>
        </div>
      )}
    </div>
  )
}
