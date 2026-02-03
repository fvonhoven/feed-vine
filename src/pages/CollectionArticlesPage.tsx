import { useParams, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { ArticleWithStatus, FeedCollection } from "../types/database"
import ArticleCard from "../components/ArticleCard"
import toast from "react-hot-toast"

export default function CollectionArticlesPage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const queryClient = useQueryClient()

  // Fetch collection info
  const { data: collection, isLoading: isCollectionLoading } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: async () => {
      if (!collectionId) throw new Error("Collection ID is required")
      if (isDemoMode) {
        return null
      }
      const { data, error } = await supabase.from("feed_collections").select("*").eq("id", collectionId).single()
      if (error) throw error
      return data as FeedCollection
    },
    enabled: !!collectionId,
  })

  // Fetch articles for this collection
  const { data: articles, isLoading: isArticlesLoading } = useQuery({
    queryKey: ["collection-articles", collectionId],
    queryFn: async () => {
      if (!collectionId) throw new Error("Collection ID is required")
      if (isDemoMode) {
        return []
      }

      // 1. Get all feed IDs in this collection
      const { data: sources, error: sourcesError } = await supabase
        .from("feed_collection_sources")
        .select("feed_id")
        .eq("collection_id", collectionId)

      if (sourcesError) throw sourcesError
      
      const feedIds = sources?.map(s => s.feed_id) || []

      if (feedIds.length === 0) return []

      // 2. Fetch articles from these feeds
      const { data, error } = await supabase
        .from("articles")
        .select(
          `
          *,
          feed:feeds(title, url),
          user_article:user_articles!left(is_read, is_saved)
        `,
        )
        .in("feed_id", feedIds)
        .order("published_at", { ascending: false })
        .limit(100)

      if (error) throw error

      return (data || []).map(article => ({
        ...article,
        user_article: Array.isArray(article.user_article) && article.user_article.length > 0 ? article.user_article[0] : null,
      })) as ArticleWithStatus[]
    },
    enabled: !!collectionId,
  })

  // Toggle read mutation (Duplicated from FeedArticlesPage - could be extracted to hook)
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
      queryClient.invalidateQueries({ queryKey: ["collection-articles", collectionId] })
      // Also invalidate individual feed methods if needed, but not strictly necessary for this view
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
      queryClient.invalidateQueries({ queryKey: ["collection-articles", collectionId] })
      toast.success(isSaved ? "Article saved!" : "Article removed from saved")
    },
  })

  if (isCollectionLoading || isArticlesLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link to="/marketplace" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
          ← Back to Marketplace
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {collection?.name || "Collection Articles"}
        </h1>
        {collection?.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl">{collection.description}</p>
        )}
        
        {collection?.tags && collection.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {collection.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {collection?.slug && (
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => {
                const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-collection/${collection.slug}.rss`
                navigator.clipboard.writeText(url)
                toast.success("RSS URL copied to clipboard")
              }}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="mr-2 h-4 w-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a1 1 0 000 2c5.523 0 10 4.477 10 10a1 1 0 102 0C17 8.373 11.627 3 5 3z" />
                <path d="M5 7a1 1 0 000 2c3.314 0 6 2.686 6 6a1 1 0 102 0c0-4.418-3.582-8-8-8z" />
                <path d="M5 11a1 1 0 000 2 1 1 0 100-2z" />
              </svg>
              Copy RSS Feed
            </button>
            
            {(collection.output_format === 'json' || collection.output_format === 'both') && (
              <button
                onClick={() => {
                  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-collection/${collection.slug}.json`
                  navigator.clipboard.writeText(url)
                  toast.success("JSON Feed URL copied to clipboard")
                }}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="mr-2 h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
                Copy JSON Feed
              </button>
            )}
          </div>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 border-t border-gray-200 dark:border-gray-700 pt-2">
           {articles?.length || 0} articles from this collection
        </p>
      </div>

      {articles?.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No articles found for this collection.</p>
          <p className="text-sm text-gray-400 mt-2">The feeds in this collection might need to be refreshed or are empty.</p>
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
