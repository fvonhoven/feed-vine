import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { Feed, Category } from "../types/database"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"
import { mockFeeds, mockCategories } from "../lib/mockData"
import { fetchAndSaveArticles, discoverRSSFeeds, refreshAllFeeds } from "../lib/rssFetcher"
import { useSubscription } from "../hooks/useSubscription"
import { Link } from "react-router-dom"

export default function FeedManager() {
  const [newFeedUrl, setNewFeedUrl] = useState("")
  const [refreshingFeedId, setRefreshingFeedId] = useState<string | null>(null)
  const [validatingFeedId, setValidatingFeedId] = useState<string | null>(null)
  const [deletingFeedId, setDeletingFeedId] = useState<string | null>(null)
  const [feedToDelete, setFeedToDelete] = useState<Feed | null>(null)
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const queryClient = useQueryClient()
  const { getLimit } = useSubscription()

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      // In demo mode, return mock feeds
      if (isDemoMode) {
        return mockFeeds
      }

      const { data, error } = await supabase.from("feeds").select("*").order("title", { ascending: true })

      if (error) throw error
      return data as Feed[]
    },
  })

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      if (isDemoMode) {
        return mockCategories
      }
      const { data, error } = await supabase.from("categories").select("*").order("name")
      if (error) throw error
      return data as Category[]
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to create categories")
      }
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase.from("categories").insert({ user_id: user.id, name }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setNewCategoryName("")
      toast.success("Category created!")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to delete categories")
      }
      const { error } = await supabase.from("categories").delete().eq("id", categoryId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      toast.success("Category deleted!")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateFeedCategoryMutation = useMutation({
    mutationFn: async ({ feedId, categoryId }: { feedId: string; categoryId: string | null }) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to update feeds")
      }
      const { error } = await supabase.from("feeds").update({ category_id: categoryId }).eq("id", feedId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      toast.success("Feed category updated!")
    },
    onError: (error: Error) => {
      toast.error(error.message)
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

      // Validate feed before adding to database
      toast.loading("Validating feed...")
      try {
        const { data: validationData, error: validationError } = await supabase.functions.invoke("fetch-rss", {
          body: { url: feedUrl },
        })

        toast.dismiss()

        if (validationError || !validationData.success || !validationData.results || validationData.results.length === 0) {
          throw new Error("Failed to validate feed - unable to fetch content")
        }

        const result = validationData.results[0]
        if (!result.success) {
          throw new Error(result.error || "Feed validation failed")
        }

        // Update title from feed if available
        if (result.feedTitle) {
          feedTitle = result.feedTitle
        }

        toast.success("Feed validated! Adding to your feeds...")
      } catch (validationError: any) {
        toast.dismiss()
        throw new Error(`Feed validation failed: ${validationError.message || "Unable to fetch feed"}`)
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

      setDeletingFeedId(feedId)
      const { error } = await supabase.from("feeds").delete().eq("id", feedId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      toast.success("Feed removed successfully!")
      setDeletingFeedId(null)
      setFeedToDelete(null)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove feed")
      setDeletingFeedId(null)
      setFeedToDelete(null)
    },
  })

  const handleDeleteClick = (feed: Feed) => {
    setFeedToDelete(feed)
  }

  const confirmDelete = () => {
    if (feedToDelete) {
      deleteFeedMutation.mutate(feedToDelete.id)
    }
  }

  const cancelDelete = () => {
    setFeedToDelete(null)
  }

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

  const refreshAllFeedsMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        throw new Error("Demo mode: Cannot refresh feeds")
      }
      setIsRefreshingAll(true)
      return await refreshAllFeeds()
    },
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      setIsRefreshingAll(false)
      if (result.failed > 0) {
        toast.success(`Refreshed ${result.success} feeds. ${result.failed} failed.`)
      } else {
        toast.success(`Successfully refreshed all ${result.success} feeds!`)
      }
    },
    onError: (error: any) => {
      setIsRefreshingAll(false)
      toast.error(error.message || "Failed to refresh feeds")
    },
  })

  const validateFeedMutation = useMutation({
    mutationFn: async (feed: Feed) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Cannot validate feeds")
      }
      setValidatingFeedId(feed.id)

      const { data, error } = await supabase.functions.invoke("fetch-rss", {
        body: { url: feed.url },
      })

      if (error) throw error

      if (!data.success || !data.results || data.results.length === 0) {
        throw new Error("Failed to validate feed")
      }

      const result = data.results[0]
      if (!result.success) {
        throw new Error(result.error || "Feed validation failed")
      }

      return result
    },
    onSuccess: (result, feed) => {
      setValidatingFeedId(null)
      toast.success(`Feed is valid! Found ${result.articlesCount || 0} articles.`)

      // Update feed status to active if it was in error
      if (feed.status === "error") {
        supabase
          .from("feeds")
          .update({ status: "active", error_message: null })
          .eq("id", feed.id)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["feeds"] })
          })
      }
    },
    onError: (error: any, feed) => {
      setValidatingFeedId(null)
      toast.error(`Validation failed: ${error.message}`)

      // Update feed with error status
      supabase
        .from("feeds")
        .update({ status: "error", error_message: error.message })
        .eq("id", feed.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["feeds"] })
        })
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

      {/* Category Manager */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
        >
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Categories ({categories?.length || 0})</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">{showCategoryManager ? "Hide" : "Manage"}</span>
            <svg
              className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${showCategoryManager ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        {showCategoryManager && (
          <div className="p-6 space-y-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                if (newCategoryName.trim()) {
                  createCategoryMutation.mutate(newCategoryName.trim())
                }
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="New category name..."
                className="flex-1 px-3 py-2 rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              <button
                type="submit"
                disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
              >
                {createCategoryMutation.isPending ? "Adding..." : "Add Category"}
              </button>
            </form>
            {categories && categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <span className="text-sm text-gray-900 dark:text-white">{cat.name}</span>
                    <button
                      onClick={() => deleteCategoryMutation.mutate(cat.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No categories yet. Create one to organize your feeds!</p>
            )}
          </div>
        )}
      </div>

      {/* Feeds List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Feeds ({feeds?.length || 0})</h2>
          {feeds && feeds.length > 0 && (
            <button
              onClick={() => refreshAllFeedsMutation.mutate()}
              disabled={isRefreshingAll || isDemoMode}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh all feeds"
            >
              <svg className={`w-4 h-4 ${isRefreshingAll ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="ml-1.5">{isRefreshingAll ? "Refreshing All..." : "Refresh All"}</span>
            </button>
          )}
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
                      <select
                        value={feed.category_id || ""}
                        onChange={e =>
                          updateFeedCategoryMutation.mutate({
                            feedId: feed.id,
                            categoryId: e.target.value || null,
                          })
                        }
                        className="px-2 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        <option value="">Uncategorized</option>
                        {categories?.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {feed.error_message && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        <span className="font-medium">Error:</span> {feed.error_message}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {feed.status === "error" && (
                      <button
                        onClick={() => validateFeedMutation.mutate(feed)}
                        disabled={validatingFeedId === feed.id}
                        className="inline-flex items-center px-3 py-1.5 border border-yellow-300 dark:border-yellow-600 text-xs font-medium rounded text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                        title="Test if feed is working"
                      >
                        <svg
                          className={`w-4 h-4 ${validatingFeedId === feed.id ? "animate-spin" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="ml-1.5">{validatingFeedId === feed.id ? "Testing..." : "Test"}</span>
                      </button>
                    )}
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
                      onClick={() => handleDeleteClick(feed)}
                      disabled={deletingFeedId === feed.id}
                      className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 transition-colors"
                      title="Delete feed"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Delete Confirmation Dialog */}
      {feedToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Delete Feed</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Are you sure you want to delete <span className="font-semibold">"{feedToDelete.title}"</span>? This will also delete all articles
                  from this feed. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cancelDelete}
                disabled={deletingFeedId === feedToDelete.id}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingFeedId === feedToDelete.id}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deletingFeedId === feedToDelete.id ? "Deleting..." : "Delete Feed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
