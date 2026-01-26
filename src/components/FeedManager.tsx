import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { Feed } from "../types/database"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"
import { mockFeeds } from "../lib/mockData"
import { fetchAndSaveArticles, discoverRSSFeeds } from "../lib/rssFetcher"
import { useSubscription } from "../hooks/useSubscription"
import { Link } from "react-router-dom"

export default function FeedManager() {
  const [newFeedUrl, setNewFeedUrl] = useState("")
  const [refreshingFeedId, setRefreshingFeedId] = useState<string | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null)
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

      let feedUrl = url
      let feedTitle = new URL(url).hostname

      // Check if URL looks like a direct RSS feed or a website
      const isLikelyRSSFeed =
        url.includes("/feed") ||
        url.includes("/rss") ||
        url.includes(".xml") ||
        url.includes("/atom") ||
        url.endsWith("/feed/") ||
        url.endsWith("/rss/")

      // If it doesn't look like an RSS feed, try auto-discovery
      if (!isLikelyRSSFeed) {
        try {
          toast.loading("Discovering RSS feed...")
          const discoveredFeeds = await discoverRSSFeeds(url)
          toast.dismiss()

          if (discoveredFeeds.length > 0) {
            feedUrl = discoveredFeeds[0].url
            feedTitle = discoveredFeeds[0].title || feedTitle
            toast.success(`Found RSS feed: ${feedUrl}`)
          } else {
            toast("No RSS feed found, trying URL as-is...", { icon: "⚠️" })
          }
        } catch (discoveryError) {
          toast.dismiss()
          console.warn("RSS discovery failed, using URL as-is:", discoveryError)
          toast("RSS discovery failed, trying URL as-is...", { icon: "⚠️" })
        }
      }

      const { data, error } = await supabase
        .from("feeds")
        .insert({
          user_id: user.id,
          url: feedUrl,
          title: feedTitle,
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

  const bulkImportMutation = useMutation({
    mutationFn: async (file: File) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to import feeds")
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Read CSV file
      const text = await file.text()
      const lines = text.split("\n").filter(line => line.trim())

      if (lines.length === 0) {
        throw new Error("CSV file is empty")
      }

      // Parse CSV (simple parser - assumes title in first column, URL in second column)
      const feedsToImport: { url: string; title?: string }[] = []
      let hasHeader = false

      // Check if first line is a header
      const firstLine = lines[0].toLowerCase()
      if (firstLine.includes("title") || firstLine.includes("name") || firstLine.includes("url") || firstLine.includes("feed")) {
        hasHeader = true
      }

      const dataLines = hasHeader ? lines.slice(1) : lines

      // Process each line and auto-discover RSS feeds
      toast.loading("Processing URLs and discovering RSS feeds...")

      for (const line of dataLines) {
        const columns = line.split(",").map(col => col.trim().replace(/^["']|["']$/g, ""))
        const title = columns[0]
        const url = columns[1] || columns[0] // Fallback to first column if only one column

        if (!url) continue

        // Validate URL format
        try {
          new URL(url)

          // Check if URL looks like a direct RSS feed or a website
          const isLikelyRSSFeed =
            url.includes("/feed") ||
            url.includes("/rss") ||
            url.includes(".xml") ||
            url.includes("/atom") ||
            url.endsWith("/feed/") ||
            url.endsWith("/rss/")

          if (isLikelyRSSFeed) {
            // Assume it's a direct RSS feed URL
            feedsToImport.push({
              url,
              title: title || new URL(url).hostname,
            })
          } else {
            // Try to auto-discover RSS feed from website URL
            try {
              const discoveredFeeds = await discoverRSSFeeds(url)

              if (discoveredFeeds.length > 0) {
                // Use the first discovered feed
                const feed = discoveredFeeds[0]
                feedsToImport.push({
                  url: feed.url,
                  title: title || feed.title || new URL(url).hostname,
                })
                console.log(`Auto-discovered feed: ${feed.url} from ${url}`)
              } else {
                // No feed found, try the URL as-is (might still be a valid feed)
                feedsToImport.push({
                  url,
                  title: title || new URL(url).hostname,
                })
                console.warn(`No RSS feed discovered for ${url}, using URL as-is`)
              }
            } catch (discoveryError) {
              // Discovery failed, use URL as-is
              console.warn(`RSS discovery failed for ${url}, using URL as-is:`, discoveryError)
              feedsToImport.push({
                url,
                title: title || new URL(url).hostname,
              })
            }
          }
        } catch {
          console.warn(`Skipping invalid URL: ${url}`)
        }
      }

      toast.dismiss()

      if (feedsToImport.length === 0) {
        throw new Error("No valid feed URLs found in CSV")
      }

      // Check plan limits
      const currentFeedCount = feeds?.length || 0
      const maxFeeds = getLimit("maxFeeds")
      const availableSlots = maxFeeds - currentFeedCount

      if (feedsToImport.length > availableSlots) {
        throw new Error(
          `Cannot import ${feedsToImport.length} feeds. You have ${availableSlots} slot${availableSlots === 1 ? "" : "s"} available. Upgrade your plan to add more!`,
        )
      }

      // Insert feeds in batch
      const { data, error } = await supabase
        .from("feeds")
        .insert(
          feedsToImport.map(feed => ({
            user_id: user.id,
            url: feed.url,
            title: feed.title || new URL(feed.url).hostname,
            status: "active" as const,
          })),
        )
        .select()

      if (error) {
        // Check for duplicate URLs
        if (error.code === "23505") {
          throw new Error("Some feed URLs already exist in your account")
        }
        throw error
      }

      return { feeds: data, count: data.length }
    },
    onSuccess: async result => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      setBulkImportFile(null)
      setShowBulkImport(false)
      toast.success(`Successfully imported ${result.count} feed${result.count === 1 ? "" : "s"}!`)

      // Optionally fetch articles for all imported feeds
      toast.loading("Fetching articles from imported feeds...")
      let totalArticles = 0

      for (const feed of result.feeds) {
        try {
          const count = await fetchAndSaveArticles(feed.id, feed.url)
          totalArticles += count
        } catch (error) {
          console.error(`Failed to fetch articles for ${feed.url}:`, error)
        }
      }

      queryClient.invalidateQueries({ queryKey: ["articles"] })
      toast.dismiss()
      toast.success(`Fetched ${totalArticles} articles from ${result.count} feed${result.count === 1 ? "" : "s"}!`)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import feeds")
    },
  })

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault()
    if (bulkImportFile) {
      bulkImportMutation.mutate(bulkImportFile)
    }
  }

  const downloadSampleCSV = () => {
    const sampleCSV = `title,url
TechCrunch,https://techcrunch.com
The Verge,https://www.theverge.com/rss/index.xml
Ars Technica,https://arstechnica.com
Example Feed,https://feeds.feedburner.com/example`

    const blob = new Blob([sampleCSV], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample-feeds.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentFeedCount = feeds?.length || 0
  const maxFeeds = getLimit("maxFeeds")
  const isAtLimit = currentFeedCount >= maxFeeds

  return (
    <div className="space-y-6">
      {/* Add Feed Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Add New Feed</h2>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowBulkImport(!showBulkImport)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              {showBulkImport ? "Single Import" : "Bulk Import CSV"}
            </button>
            <span className={`text-sm ${isAtLimit ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
              {currentFeedCount} / {maxFeeds} feeds
            </span>
          </div>
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

        {!showBulkImport ? (
          <form onSubmit={handleAddFeed} className="flex gap-3">
            <input
              type="url"
              value={newFeedUrl}
              onChange={e => setNewFeedUrl(e.target.value)}
              placeholder="https://example.com or https://example.com/feed.xml"
              className="flex-1 px-3 py-2 rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">CSV Format</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Upload a CSV file with <strong>title</strong> in the first column and <strong>URL</strong> in the second column. The file should have
                a header row.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                <strong>✨ Auto-Discovery:</strong> You can provide website URLs (e.g., https://techcrunch.com) and we'll automatically find the RSS
                feed!
              </p>
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 underline font-medium"
              >
                Download sample CSV template
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-3">
              <div>
                <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select CSV File
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setBulkImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAtLimit}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!bulkImportFile || bulkImportMutation.isPending || isAtLimit}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkImportMutation.isPending ? "Importing..." : "Import Feeds"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkImport(false)
                    setBulkImportFile(null)
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
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
