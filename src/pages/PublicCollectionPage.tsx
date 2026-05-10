import { useEffect, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { isDemoMode } from "../lib/supabase"
import PublicArticleCard, { type PublicArticleCardItem } from "../components/PublicArticleCard"

/** JSON from `serve-collection` (.json); includes a FeedVine-specific `_feedvine` block when the function is deployed. */
interface ServeCollectionJson {
  title: string
  description?: string
  items?: Array<{
    id: string
    url: string
    title: string
    content_html?: string
    summary?: string
    date_published?: string
    _source?: { title: string; url: string }
  }>
  _feedvine?: {
    slug: string
    tags: string[] | null
    output_format: string
  }
}

function mapItemsToCards(items: NonNullable<ServeCollectionJson["items"]>): PublicArticleCardItem[] {
  return items.map(item => ({
    id: item.id || item.url,
    title: item.title,
    url: item.url,
    description: item.summary ?? null,
    content: item.content_html ?? null,
    published_at: item.date_published || new Date().toISOString(),
  }))
}

async function fetchPublicCollectionJson(slug: string, supabaseUrl: string): Promise<ServeCollectionJson> {
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/serve-collection/${encodeURIComponent(slug)}.json`
  const res = await fetch(url)
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok) {
    const errMsg =
      body && typeof body === "object" && body !== null && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : "Collection not found or not public"
    throw new Error(errMsg)
  }

  return body as ServeCollectionJson
}

export default function PublicCollectionPage() {
  const { slug } = useParams<{ slug: string }>()
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ""

  const shell = (inner: ReactNode) => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">{inner}</div>
  )

  const {
    data: feedJson,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-collection-feed", slug],
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      if (!slug) throw new Error("Missing slug")
      return fetchPublicCollectionJson(slug, supabaseUrl)
    },
    enabled: Boolean(slug && supabaseUrl && !isDemoMode),
  })

  const articles = feedJson?.items?.length ? mapItemsToCards(feedJson.items) : []

  useEffect(() => {
    if (feedJson?.title) {
      document.title = `${feedJson.title} · FeedVine`
    }
    return () => {
      document.title = "FeedVine"
    }
  }, [feedJson?.title])

  if (isDemoMode) {
    return shell(
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-600 dark:text-gray-400">
        Connect Supabase in <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.local</code> to view public collections.
      </div>,
    )
  }

  if (!supabaseUrl) {
    return shell(
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-600 dark:text-gray-400">
        Missing <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">VITE_SUPABASE_URL</code>.
      </div>,
    )
  }

  if (!slug) {
    return shell(
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-600 dark:text-gray-400">Missing collection slug in URL.</div>,
    )
  }

  if (isLoading) {
    return shell(
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>,
    )
  }

  if (isError || !feedJson) {
    return shell(
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Collection not found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error instanceof Error ? error.message : "This link may be wrong, or the collection is not public anymore."}
        </p>
        <Link to="/" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
          Back to FeedVine
        </Link>
      </div>,
    )
  }

  return shell(
    <div className="max-w-4xl mx-auto px-4 py-6 pb-12">
      {articles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
          No articles yet. Feeds may still be syncing.
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map(a => (
            <PublicArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>,
  )
}
