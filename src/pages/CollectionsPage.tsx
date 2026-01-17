import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { FeedCollection, Feed } from "../types/database"
import toast from "react-hot-toast"
import { useSubscription } from "../hooks/useSubscription"
import { Link } from "react-router-dom"

export default function CollectionsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollection, setNewCollection] = useState({
    name: "",
    slug: "",
    description: "",
    is_public: true,
    output_format: "rss" as "rss" | "json" | "both",
  })
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [selectedFeedsForNewCollection, setSelectedFeedsForNewCollection] = useState<string[]>([])
  const queryClient = useQueryClient()
  const { getLimit } = useSubscription()

  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ["feed-collections"],
    queryFn: async () => {
      if (isDemoMode) {
        return []
      }

      const { data, error } = await supabase
        .from("feed_collections")
        .select(
          `
          *,
          sources:feed_collection_sources(
            feed:feeds(id, title, url)
          )
        `,
        )
        .order("created_at", { ascending: false })

      if (error) throw error
      return data
    },
  })

  const { data: feeds } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      if (isDemoMode) {
        return []
      }

      const { data, error } = await supabase.from("feeds").select("*").order("title")

      if (error) throw error
      return data as Feed[]
    },
  })

  const createCollectionMutation = useMutation({
    mutationFn: async (data: { collection: typeof newCollection; feedIds: string[] }) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to create collections")
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Check plan limits
      const currentCollectionCount = collections?.length || 0
      const maxCollections = getLimit("maxCollections")
      if (maxCollections !== -1 && currentCollectionCount >= maxCollections) {
        throw new Error(`You've reached your plan limit of ${maxCollections} collection${maxCollections === 1 ? "" : "s"}. Upgrade to create more!`)
      }

      // Create the collection
      const { data: newCollectionData, error: collectionError } = await supabase
        .from("feed_collections")
        .insert({
          user_id: user.id,
          ...data.collection,
        })
        .select()
        .single()

      if (collectionError) throw collectionError

      // Add feeds to the collection
      if (data.feedIds.length > 0) {
        const { error: sourcesError } = await supabase.from("feed_collection_sources").insert(
          data.feedIds.map(feedId => ({
            collection_id: newCollectionData.id,
            feed_id: feedId,
          })),
        )

        if (sourcesError) throw sourcesError
      }

      return newCollectionData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-collections"] })
      toast.success("Collection created!")
      setShowCreateForm(false)
      setNewCollection({
        name: "",
        slug: "",
        description: "",
        is_public: true,
        output_format: "rss",
      })
      setSelectedFeedsForNewCollection([])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const addFeedToCollectionMutation = useMutation({
    mutationFn: async ({ collectionId, feedId }: { collectionId: string; feedId: string }) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to add feeds")
      }

      const { error } = await supabase.from("feed_collection_sources").insert({
        collection_id: collectionId,
        feed_id: feedId,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-collections"] })
      toast.success("Feed added to collection!")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const removeFeedFromCollectionMutation = useMutation({
    mutationFn: async ({ collectionId, feedId }: { collectionId: string; feedId: string }) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to remove feeds")
      }

      const { error } = await supabase.from("feed_collection_sources").delete().eq("collection_id", collectionId).eq("feed_id", feedId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-collections"] })
      toast.success("Feed removed from collection!")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to delete collections")
      }

      const { error } = await supabase.from("feed_collections").delete().eq("id", collectionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-collections"] })
      toast.success("Collection deleted!")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault()
    createCollectionMutation.mutate({
      collection: newCollection,
      feedIds: selectedFeedsForNewCollection,
    })
  }

  const toggleFeedSelection = (feedId: string) => {
    setSelectedFeedsForNewCollection(prev => (prev.includes(feedId) ? prev.filter(id => id !== feedId) : [...prev, feedId]))
  }

  const handleSlugChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    setNewCollection({ ...newCollection, name, slug })
  }

  const copyFeedURL = (collection: FeedCollection, format: "rss" | "json") => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const url = `${supabaseUrl}/functions/v1/serve-collection/${collection.slug}.${format}`
    navigator.clipboard.writeText(url)
    toast.success(`${format.toUpperCase()} URL copied to clipboard!`)
  }

  if (isDemoMode) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Demo Mode:</strong> Connect Supabase to create and manage feed collections.
          </p>
        </div>
      </div>
    )
  }

  const currentCollectionCount = collections?.length || 0
  const maxCollections = getLimit("maxCollections")
  const isAtLimit = maxCollections !== -1 && currentCollectionCount >= maxCollections

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feed Collections</h1>
          <span className={`text-sm ${isAtLimit ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
            {currentCollectionCount} / {maxCollections === -1 ? "∞" : maxCollections} collections
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create aggregated feeds from multiple sources for use in Zapier, IFTTT, and other automation tools
          </p>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={isAtLimit && !showCreateForm}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ml-4"
          >
            {showCreateForm ? "Cancel" : "Create Collection"}
          </button>
        </div>
        {isAtLimit && !showCreateForm && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You've reached your plan limit.{" "}
              <Link to="/pricing" className="font-semibold underline hover:text-yellow-900 dark:hover:text-yellow-100">
                Upgrade to create more collections
              </Link>
            </p>
          </div>
        )}
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Collection</h2>
          <form onSubmit={handleCreateCollection} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Collection Name</label>
              <input
                type="text"
                value={newCollection.name}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="e.g., AI News"
                required
                className="w-full rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug (URL-friendly name)</label>
              <input
                type="text"
                value={newCollection.slug}
                onChange={e => setNewCollection({ ...newCollection, slug: e.target.value })}
                placeholder="ai-news"
                required
                pattern="[a-z0-9-]+"
                className="w-full rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Only lowercase letters, numbers, and hyphens</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
              <textarea
                value={newCollection.description}
                onChange={e => setNewCollection({ ...newCollection, description: e.target.value })}
                placeholder="A collection of AI-related news from multiple sources"
                rows={3}
                className="w-full rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newCollection.is_public}
                  onChange={e => setNewCollection({ ...newCollection, is_public: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Public (accessible without authentication)</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Output Format</label>
              <select
                value={newCollection.output_format}
                onChange={e => setNewCollection({ ...newCollection, output_format: e.target.value as "rss" | "json" | "both" })}
                className="w-full rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="rss">RSS only</option>
                <option value="json">JSON only</option>
                <option value="both">Both RSS and JSON</option>
              </select>
            </div>

            {/* Feed Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Feeds ({selectedFeedsForNewCollection.length} selected)
                </label>
                {feeds && feeds.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFeedsForNewCollection(selectedFeedsForNewCollection.length === feeds.length ? [] : feeds.map(f => f.id))
                    }
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {selectedFeedsForNewCollection.length === feeds.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              {feeds && feeds.length > 0 ? (
                <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
                  {feeds.map(feed => (
                    <label
                      key={feed.id}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFeedsForNewCollection.includes(feed.id)}
                        onChange={() => toggleFeedSelection(feed.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-3 text-sm text-gray-900 dark:text-white">{feed.title}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-3 px-4 bg-gray-50 dark:bg-gray-900 rounded-md">
                  No feeds available. Add feeds first from the Feeds page.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={createCollectionMutation.isPending}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
            </button>
          </form>
        </div>
      )}

      {collectionsLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : collections && collections.length > 0 ? (
        <div className="space-y-4">
          {collections.map(collection => (
            <div key={collection.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{collection.name}</h3>
                  {collection.description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{collection.description}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        collection.is_public
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {collection.is_public ? "Public" : "Private"}
                    </span>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                      {collection.output_format.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteCollectionMutation.mutate(collection.id)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              {/* Feed URLs */}
              <div className="mb-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Feed URLs:</h4>
                {(collection.output_format === "rss" || collection.output_format === "both") && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded text-gray-900 dark:text-white overflow-x-auto">
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-collection/{collection.slug}.rss
                    </code>
                    <button
                      onClick={() => copyFeedURL(collection, "rss")}
                      className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Copy RSS
                    </button>
                  </div>
                )}
                {(collection.output_format === "json" || collection.output_format === "both") && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded text-gray-900 dark:text-white overflow-x-auto">
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-collection/{collection.slug}.json
                    </code>
                    <button
                      onClick={() => copyFeedURL(collection, "json")}
                      className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Copy JSON
                    </button>
                  </div>
                )}
              </div>

              {/* Feeds in collection */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Feeds in this collection ({collection.sources?.length || 0}):
                </h4>
                {collection.sources && collection.sources.length > 0 ? (
                  <div className="space-y-2">
                    {collection.sources.map((source: any) => (
                      <div key={source.feed.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded">
                        <span className="text-sm text-gray-900 dark:text-white">{source.feed.title}</span>
                        <button
                          onClick={() =>
                            removeFeedFromCollectionMutation.mutate({
                              collectionId: collection.id,
                              feedId: source.feed.id,
                            })
                          }
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No feeds added yet</p>
                )}

                {/* Add feed to collection */}
                <div className="mt-3">
                  <button
                    onClick={() => setSelectedCollectionId(selectedCollectionId === collection.id ? null : collection.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {selectedCollectionId === collection.id ? "Cancel" : "+ Add Feed"}
                  </button>

                  {selectedCollectionId === collection.id && (
                    <div className="mt-2 space-y-2">
                      {feeds
                        ?.filter(feed => !collection.sources?.some((s: any) => s.feed.id === feed.id))
                        .map(feed => (
                          <button
                            key={feed.id}
                            onClick={() =>
                              addFeedToCollectionMutation.mutate({
                                collectionId: collection.id,
                                feedId: feed.id,
                              })
                            }
                            className="block w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-800"
                          >
                            {feed.title}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No collections yet. Create your first collection to get started!</p>
        </div>
      )}
    </div>
  )
}
