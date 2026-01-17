import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { Feed } from "../types/database"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"
import { mockFeeds } from "../lib/mockData"
import { fetchAndSaveArticles } from "../lib/rssFetcher"
import { useSubscription } from "../hooks/useSubscription"
import { Link } from "react-router-dom"

export default function FeedManager() {
  const [newFeedUrl, setNewFeedUrl] = useState("")
  const [refreshingFeedId, setRefreshingFeedId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { getLimit } = useSubscription()

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      // In demo mode, return mock feeds
      if (isDemoMode) {
        return mockFeeds
      }

      const { data, error } = await supabase.from("feeds").select("*").order("created_at", { ascending: false })

      if (error) throw error
      return data as Feed[]
    },
  })

  const addFeedMutation = useMutation({
    mutationFn: async (url: string) => {
      // In demo mode, show a message
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to add real feeds")
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Check plan limits
      const currentFeedCount = feeds?.length || 0
      const maxFeeds = getLimit("maxFeeds")
      if (currentFeedCount >= maxFeeds) {
        throw new Error(`You've reached your plan limit of ${maxFeeds} feed${maxFeeds === 1 ? "" : "s"}. Upgrade to add more!`)
      }

      // Validate URL format
      try {
        new URL(url)
      } catch {
        throw new Error("Invalid URL format")
      }

      const { data, error } = await supabase
        .from("feeds")
        .insert({
          user_id: user.id,
          url,
          title: new URL(url).hostname,
          status: "active" as const,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: async feed => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      setNewFeedUrl("")
      toast.success("Feed added! Fetching articles...")

      // Fetch articles from the RSS feed
      try {
        const count = await fetchAndSaveArticles(feed.id, feed.url)
        queryClient.invalidateQueries({ queryKey: ["articles"] })
        toast.success(`Successfully fetched ${count} articles!`)
      } catch (error) {
        toast.error("Failed to fetch articles from feed")
        console.error(error)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add feed")
    },
  })

  const deleteFeedMutation = useMutation({
    mutationFn: async (feedId: string) => {
      // In demo mode, show a message
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to remove feeds")
      }

      const { error } = await supabase.from("feeds").delete().eq("id", feedId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      toast.success("Feed removed successfully!")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove feed")
    },
  })

  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault()
    if (newFeedUrl.trim()) {
      addFeedMutation.mutate(newFeedUrl.trim())
    }
  }

  const refreshFeedMutation = useMutation({
    mutationFn: async (feed: Feed) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Cannot refresh feeds")
      }
      setRefreshingFeedId(feed.id)
      return await fetchAndSaveArticles(feed.id, feed.url)
    },
    onSuccess: count => {
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      setRefreshingFeedId(null)
      toast.success(`Fetched ${count} new articles!`)
    },
    onError: (error: any) => {
      setRefreshingFeedId(null)
      toast.error(error.message || "Failed to refresh feed")
    },
  })

  const currentFeedCount = feeds?.length || 0
  const maxFeeds = getLimit("maxFeeds")
  const isAtLimit = currentFeedCount >= maxFeeds

  return (
    <div className="space-y-6">
      {/* Add Feed Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Add New Feed</h2>
          <span className={`text-sm ${isAtLimit ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
            {currentFeedCount} / {maxFeeds} feeds
          </span>
        </div>
        {isAtLimit && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You've reached your plan limit.{" "}
              <Link to="/pricing" className="font-semibold underline hover:text-yellow-900 dark:hover:text-yellow-100">
                Upgrade to add more feeds
              </Link>
            </p>
          </div>
        )}
        <form onSubmit={handleAddFeed} className="flex gap-3">
          <input
            type="url"
            value={newFeedUrl}
            onChange={e => setNewFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="flex-1 rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            required
            disabled={isAtLimit}
          />
          <button
            type="submit"
            disabled={addFeedMutation.isPending || isAtLimit}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addFeedMutation.isPending ? "Adding..." : "Add Feed"}
          </button>
        </form>
      </div>

      {/* Feeds List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Feeds ({feeds?.length || 0})</h2>
        </div>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoading ? (
            <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Loading feeds...</li>
          ) : feeds?.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No feeds added yet. Add your first feed above!</li>
          ) : (
            feeds?.map(feed => (
              <li key={feed.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{feed.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{feed.url}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded ${
                          feed.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {feed.status}
                      </span>
                      {feed.last_fetched && <span>Last fetched {formatDistanceToNow(new Date(feed.last_fetched), { addSuffix: true })}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => refreshFeedMutation.mutate(feed)}
                      disabled={refreshingFeedId === feed.id}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                      title="Refresh feed"
                    >
                      <svg
                        className={`w-4 h-4 ${refreshingFeedId === feed.id ? "animate-spin" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span className="ml-1.5">{refreshingFeedId === feed.id ? "Refreshing..." : "Refresh"}</span>
                    </button>
                    <button
                      onClick={() => deleteFeedMutation.mutate(feed.id)}
                      disabled={deleteFeedMutation.isPending}
                      className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
