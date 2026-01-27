import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { ArticleWithStatus } from "../types/database"
import ArticleCard from "../components/ArticleCard"
import { mockArticlesWithStatus } from "../lib/mockData"
import toast from "react-hot-toast"

export default function SavedPage() {
  const queryClient = useQueryClient()

  const { data: articles, isLoading } = useQuery({
    queryKey: ["saved-articles"],
    queryFn: async () => {
      if (isDemoMode) {
        return mockArticlesWithStatus.filter(article => article.user_article?.is_saved)
      }

      const { data, error } = await supabase
        .from("articles")
        .select(
          `
          *,
          feed:feeds(title, url),
          user_article:user_articles!inner(is_read, is_saved, saved_at)
        `,
        )
        .eq("user_article.is_saved", true)
        .order("published_at", { ascending: false })

      if (error) {
        console.error("Saved articles query error:", error)
        throw error
      }

      // Transform the data to match ArticleWithStatus type
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
      queryClient.invalidateQueries({ queryKey: ["saved-articles"] })
    },
  })

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
      queryClient.invalidateQueries({ queryKey: ["saved-articles"] })
    },
  })

  const handleToggleRead = (articleId: string, isRead: boolean) => {
    toggleReadMutation.mutate({ articleId, isRead })
  }

  const handleToggleSave = (articleId: string, isSaved: boolean) => {
    toggleSaveMutation.mutate({ articleId, isSaved })
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Saved Articles</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{articles?.length || 0} saved articles</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : articles && articles.length > 0 ? (
        <div className="space-y-4">
          {articles.map(article => (
            <ArticleCard key={article.id} article={article} onToggleRead={handleToggleRead} onToggleSave={handleToggleSave} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No saved articles</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Save articles for later by clicking the bookmark icon.</p>
        </div>
      )}
    </div>
  )
}
