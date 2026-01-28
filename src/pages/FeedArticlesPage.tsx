import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { ArticleWithStatus, Feed } from "../types/database"
import ArticleCard from "../components/ArticleCard"
import toast from "react-hot-toast"

export default function FeedArticlesPage() {
  const { feedId } = useParams<{ feedId: string }>()
  const queryClient = useQueryClient()

  // Fetch feed info
  const { data: feed } = useQuery({
    queryKey: ["feed", feedId],
    queryFn: async () => {
      if (!feedId) throw new Error("Feed ID is required")
      if (isDemoMode) {
        return null
      }
      const { data, error } = await supabase.from("feeds").select("*").eq("id", feedId).single()
      if (error) throw error
      return data as Feed
    },
    enabled: !!feedId,
  })

  // Fetch articles for this feed
  const { data: articles, isLoading } = useQuery({
    queryKey: ["feed-articles", feedId],
    queryFn: async () => {
      if (!feedId) throw new Error("Feed ID is required")
      if (isDemoMode) {
        return []
      }

      const { data, error } = await supabase
        .from("articles")
        .select(
          `
          *,
          feed:feeds(title, url),
          user_article:user_articles!left(is_read, is_saved)
        `,
        )
        .eq("feed_id", feedId)
        .order("published_at", { ascending: false })
        .limit(100)

      if (error) throw error

      return (data || []).map(article => ({
        ...article,
        user_article: Array.isArray(article.user_article) && article.user_article.length > 0 ? article.user_article[0] : null,
      })) as ArticleWithStatus[]
    },
    enabled: !!feedId,
  })

  // Toggle read mutation
  const toggleReadMutation = useMutation({
    mutationFn: async ({ articleId, isRead }: { articleId: string; isRead: boolean }) => {
      if (isDemoMode) return { articleId, isRead }

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
      queryClient.invalidateQueries({ queryKey: ["feed-articles", feedId] })
    },
  })

  // Toggle save mutation
  const toggleSaveMutation = useMutation({
    mutationFn: async ({ articleId, isSaved }: { articleId: string; isSaved: boolean }) => {
      if (isDemoMode) {
        toast.error("Demo mode: Connect Supabase to save articles")
        return { articleId, isSaved: false }
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
      return { articleId, isSaved }
    },
    onSuccess: ({ isSaved }) => {
      queryClient.invalidateQueries({ queryKey: ["feed-articles", feedId] })
      toast.success(isSaved ? "Article saved!" : "Article removed from saved")
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link to="/" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
          ← Back to All Articles
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{feed?.title || "Feed Articles"}</h1>
        {feed?.url && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{feed.url}</p>}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{articles?.length || 0} articles</p>
      </div>

      {articles?.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No articles found for this feed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles?.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onToggleRead={(id, isRead) => toggleReadMutation.mutate({ articleId: id, isRead })}
              onToggleSave={(id, isSaved) => toggleSaveMutation.mutate({ articleId: id, isSaved })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
