import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { Feed, Category } from "../types/database"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"
import { fetchAndSaveArticles, discoverRSSFeeds, refreshAllFeeds } from "../lib/rssFetcher"
import { useSubscription } from "../hooks/useSubscription"
import { useFeedFilters } from "../hooks/useFeedFilters"
import { Link } from "react-router-dom"

export default function FeedManager() {
  const [newFeedUrl, setNewFeedUrl] = useState("")
  const [refreshingFeedId, setRefreshingFeedId] = useState<string | null>(null)
  const [refreshingFeedIds, setRefreshingFeedIds] = useState<Set<string>>(new Set())
  const [validatingFeedId, setValidatingFeedId] = useState<string | null>(null)
  const [deletingFeedId, setDeletingFeedId] = useState<string | null>(null)
  const [feedToDelete, setFeedToDelete] = useState<Feed | null>(null)
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null)
  const [editingFeedUrl, setEditingFeedUrl] = useState("")
  const [editingFeedTitle, setEditingFeedTitle] = useState("")
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null)
  const [showOpmlImport, setShowOpmlImport] = useState(false)
  const [opmlImportFile, setOpmlImportFile] = useState<File | null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6")
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")
  const [editingCategoryColor, setEditingCategoryColor] = useState("")
  const [expandedFilterFeedId, setExpandedFilterFeedId] = useState<string | null>(null)
  const [filterIncludeInput, setFilterIncludeInput] = useState("")
  const [filterExcludeInput, setFilterExcludeInput] = useState("")
  const queryClient = useQueryClient()
  const { getLimit, hasFeature } = useSubscription()
  const { filters, getFiltersForFeed, addKeyword, removeKeyword } = useFeedFilters()

  const canUseFilters = hasFeature("advancedFilters")

  const toggleFilterPanel = (feedId: string) => {
    setExpandedFilterFeedId(prev => (prev === feedId ? null : feedId))
    setFilterIncludeInput("")
    setFilterExcludeInput("")
  }

  const handleAddKeyword = (feedId: string, filterType: "include" | "exclude") => {
    const keyword = filterType === "include" ? filterIncludeInput : filterExcludeInput
    if (!keyword.trim()) return
    addKeyword({ feedId, filterType, keyword })
    if (filterType === "include") setFilterIncludeInput("")
    else setFilterExcludeInput("")
  }

  const { data: feeds, isLoading } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      // In demo mode, return empty array
      if (isDemoMode) {
        return []
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
        return []
      }
      const { data, error } = await supabase.from("categories").select("*").order("name")
      if (error) throw error
      return data as Category[]
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to create categories")
      }
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase.from("categories").insert({ user_id: user.id, name, color }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setNewCategoryName("")
      setNewCategoryColor("#3B82F6")
      toast.success("Category created!")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to update categories")
      }
      const { data, error } = await supabase.from("categories").update({ name, color }).eq("id", id).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setEditingCategoryId(null)
      setEditingCategoryName("")
      setEditingCategoryColor("")
      toast.success("Category updated!")
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
      const { data, error } = await supabase.from("feeds").update({ category_id: categoryId }).eq("id", feedId).select()

      if (error) {
        console.error("Update feed category error:", error)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      toast.success("Feed category updated!")
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error)
      toast.error(error.message || "Failed to update feed category")
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

  const toggleFullTextMutation = useMutation({
    mutationFn: async ({ feedId, enabled }: { feedId: string; enabled: boolean }) => {
      if (isDemoMode) throw new Error("Demo mode: Connect Supabase to use this feature")
      const { error } = await supabase.from("feeds").update({ full_text_enabled: enabled }).eq("id", feedId)
      if (error) throw error
      return enabled
    },
    onSuccess: enabled => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      toast.success(enabled ? "Full-text fetch enabled for this feed" : "Full-text fetch disabled")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update feed")
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

  const handleEditClick = (feed: Feed) => {
    setEditingFeedId(feed.id)
    setEditingFeedUrl(feed.url)
    setEditingFeedTitle(feed.title)
  }

  const cancelEdit = () => {
    setEditingFeedId(null)
    setEditingFeedUrl("")
    setEditingFeedTitle("")
  }

  const editFeedMutation = useMutation({
    mutationFn: async ({ feedId, url, title }: { feedId: string; url: string; title: string }) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Cannot edit feeds")
      }

      // Validate URL format
      try {
        new URL(url)
      } catch {
        throw new Error("Invalid URL format")
      }

      const { error } = await supabase.from("feeds").update({ url, title }).eq("id", feedId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      toast.success("Feed updated successfully!")
      cancelEdit()
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update feed")
    },
  })

  const handleSaveEdit = () => {
    if (editingFeedId && editingFeedUrl.trim() && editingFeedTitle.trim()) {
      editFeedMutation.mutate({
        feedId: editingFeedId,
        url: editingFeedUrl.trim(),
        title: editingFeedTitle.trim(),
      })
    }
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
      setRefreshingFeedIds(new Set())

      return await refreshAllFeeds(
        // onFeedStart callback
        (feedId: string) => {
          setRefreshingFeedIds(prev => new Set(prev).add(feedId))
        },
        // onFeedComplete callback
        (feedId: string) => {
          setRefreshingFeedIds(prev => {
            const next = new Set(prev)
            next.delete(feedId)
            return next
          })
        },
      )
    },
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ["articles"] })
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      setIsRefreshingAll(false)
      setRefreshingFeedIds(new Set())
      if (result.failed > 0) {
        toast.success(`Refreshed ${result.success} feeds. ${result.failed} failed.`)
      } else {
        toast.success(`Successfully refreshed all ${result.success} feeds!`)
      }
    },
    onError: (error: any) => {
      setIsRefreshingAll(false)
      setRefreshingFeedIds(new Set())
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

  // OPML import mutation
  const opmlImportMutation = useMutation({
    mutationFn: async (file: File) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to import feeds")
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, "application/xml")

      if (doc.querySelector("parsererror")) {
        throw new Error("Invalid OPML file — could not parse XML")
      }

      // Collect all outline elements that are RSS feeds (have xmlUrl attribute)
      const feedOutlines = Array.from(doc.querySelectorAll("outline[xmlUrl]"))

      if (feedOutlines.length === 0) {
        throw new Error("No RSS feeds found in OPML file")
      }

      // Build a map of category name -> category DB id (create missing ones)
      const categoryMap: Record<string, string> = {}
      // Pre-load existing categories
      const { data: existingCats } = await supabase.from("categories").select("id, name").eq("user_id", user.id)
      for (const cat of existingCats || []) {
        categoryMap[cat.name.toLowerCase()] = cat.id
      }

      // Helper: get or create a category by name
      const getOrCreateCategory = async (name: string): Promise<string | null> => {
        if (!name) return null
        const key = name.toLowerCase()
        if (categoryMap[key]) return categoryMap[key]
        const { data, error } = await supabase.from("categories").insert({ user_id: user.id, name, color: "#3B82F6" }).select("id").single()
        if (error) return null
        categoryMap[key] = data.id
        return data.id
      }

      // Check plan limits
      const currentFeedCount = feeds?.length || 0
      const maxFeeds = getLimit("maxFeeds")
      const availableSlots = maxFeeds - currentFeedCount
      if (feedOutlines.length > availableSlots) {
        throw new Error(`Cannot import ${feedOutlines.length} feeds. You have ${availableSlots} slot${availableSlots === 1 ? "" : "s"} available.`)
      }

      // Parse each outline
      const feedsToInsert: { user_id: string; url: string; title: string; status: "active"; category_id: string | null }[] = []
      for (const outline of feedOutlines) {
        const url = outline.getAttribute("xmlUrl") || ""
        const title = outline.getAttribute("title") || outline.getAttribute("text") || new URL(url).hostname
        if (!url) continue

        // Parent outline may represent the category folder
        const parentEl = outline.parentElement
        const parentTitle = parentEl?.getAttribute("title") || parentEl?.getAttribute("text") || ""
        const isParentFolder = parentEl?.tagName === "outline" && !parentEl.getAttribute("xmlUrl")
        const categoryName = isParentFolder ? parentTitle : ""
        const categoryId = categoryName ? await getOrCreateCategory(categoryName) : null

        feedsToInsert.push({ user_id: user.id, url, title, status: "active", category_id: categoryId })
      }

      // Batch insert (ignore duplicates via ON CONFLICT DO NOTHING)
      const { data, error } = await supabase.from("feeds").upsert(feedsToInsert, { onConflict: "user_id,url", ignoreDuplicates: true }).select()

      if (error) throw error
      return { feeds: data || [], count: (data || []).length, total: feedsToInsert.length }
    },
    onSuccess: async result => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] })
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setOpmlImportFile(null)
      setShowOpmlImport(false)
      const skipped = result.total - result.count
      const msg =
        skipped > 0
          ? `Imported ${result.count} feeds (${skipped} already existed).`
          : `Successfully imported ${result.count} feed${result.count === 1 ? "" : "s"}!`
      toast.success(msg)

      if (result.feeds.length > 0) {
        toast.loading("Fetching articles from imported feeds...")
        let totalArticles = 0
        for (const feed of result.feeds) {
          try {
            const count = await fetchAndSaveArticles(feed.id, feed.url)
            totalArticles += count
          } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ["articles"] })
        toast.dismiss()
        toast.success(`Fetched ${totalArticles} articles!`)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import OPML")
    },
  })

  const handleOpmlImport = (e: React.FormEvent) => {
    e.preventDefault()
    if (opmlImportFile) {
      opmlImportMutation.mutate(opmlImportFile)
    }
  }

  // OPML export
  const exportOPML = () => {
    if (!feeds || feeds.length === 0) {
      toast.error("No feeds to export")
      return
    }

    // Group by category
    const catMap: Record<string, { name: string; feeds: Feed[] }> = {}
    const uncategorized: Feed[] = []

    for (const feed of feeds) {
      if (feed.category_id) {
        if (!catMap[feed.category_id]) {
          const cat = categories?.find(c => c.id === feed.category_id)
          catMap[feed.category_id] = { name: cat?.name || "Category", feeds: [] }
        }
        catMap[feed.category_id].feeds.push(feed)
      } else {
        uncategorized.push(feed)
      }
    }

    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

    let body = ""
    for (const group of Object.values(catMap)) {
      body += `    <outline text="${esc(group.name)}" title="${esc(group.name)}">\n`
      for (const f of group.feeds) {
        body += `      <outline type="rss" text="${esc(f.title)}" title="${esc(f.title)}" xmlUrl="${esc(f.url)}" htmlUrl="${esc(f.url)}"/>\n`
      }
      body += `    </outline>\n`
    }
    for (const f of uncategorized) {
      body += `    <outline type="rss" text="${esc(f.title)}" title="${esc(f.title)}" xmlUrl="${esc(f.url)}" htmlUrl="${esc(f.url)}"/>\n`
    }

    const opml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n  <head><title>FeedVine Feeds</title></head>\n  <body>\n${body}  </body>\n</opml>`
    const blob = new Blob([opml], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "feedvine-feeds.opml"
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${feeds.length} feeds as OPML`)
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
    <div className="space-y-4 sm:space-y-6">
      {/* Add Feed Form */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Add New Feed</h2>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setShowBulkImport(!showBulkImport)
                setShowOpmlImport(false)
              }}
              className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              {showBulkImport ? "Single Import" : "CSV Import"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOpmlImport(!showOpmlImport)
                setShowBulkImport(false)
              }}
              className="text-xs sm:text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              {showOpmlImport ? "Single Import" : "OPML Import"}
            </button>
            {feeds && feeds.length > 0 && (
              <button
                type="button"
                onClick={exportOPML}
                className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
              >
                Export OPML
              </button>
            )}
            <span className={`text-xs sm:text-sm ${isAtLimit ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
              {currentFeedCount} / {maxFeeds} feeds
            </span>
          </div>
        </div>
        {isAtLimit && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
              You've reached your plan limit.{" "}
              <Link to="/pricing" className="font-semibold underline hover:text-yellow-900 dark:hover:text-yellow-100">
                Upgrade to add more feeds
              </Link>
            </p>
          </div>
        )}

        {!showBulkImport && !showOpmlImport ? (
          <form onSubmit={handleAddFeed} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={newFeedUrl}
              onChange={e => setNewFeedUrl(e.target.value)}
              placeholder="https://example.com or https://example.com/feed.xml"
              className="flex-1 px-3 py-2 rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isAtLimit}
            />
            <button
              type="submit"
              disabled={addFeedMutation.isPending || isAtLimit}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {addFeedMutation.isPending ? "Adding..." : "Add Feed"}
            </button>
          </form>
        ) : showBulkImport ? (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <h3 className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">CSV Format</h3>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-3">
                Upload a CSV file with <strong>title</strong> in the first column and <strong>URL</strong> in the second column. The file should have
                a header row.
              </p>
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 mb-3">
                <strong>✨ Auto-Discovery:</strong> You can provide website URLs (e.g., https://techcrunch.com) and we'll automatically find the RSS
                feed!
              </p>
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 underline font-medium"
              >
                Download sample CSV template
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-3">
              <div>
                <label htmlFor="csv-file" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select CSV File
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setBulkImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs sm:text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  disabled={isAtLimit}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!bulkImportFile || bulkImportMutation.isPending || isAtLimit}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {bulkImportMutation.isPending ? "Importing..." : "Import Feeds"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkImport(false)
                    setBulkImportFile(null)
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <h3 className="text-xs sm:text-sm font-medium text-green-900 dark:text-green-100 mb-2">OPML Import</h3>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                Upload an <strong>.opml</strong> file exported from Feedly, Inoreader, NetNewsWire, or any other RSS reader. Folder names become
                categories automatically.
              </p>
            </div>
            <form onSubmit={handleOpmlImport} className="space-y-3">
              <div>
                <label htmlFor="opml-file" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select OPML File
                </label>
                <input
                  id="opml-file"
                  type="file"
                  accept=".opml,.xml,application/xml,text/xml"
                  onChange={e => setOpmlImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs sm:text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  disabled={isAtLimit}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!opmlImportFile || opmlImportMutation.isPending || isAtLimit}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {opmlImportMutation.isPending ? "Importing..." : "Import OPML"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOpmlImport(false)
                    setOpmlImportFile(null)
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 min-h-[44px]"
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
          className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
        >
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Categories ({categories?.length || 0})</h2>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${showCategoryManager ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showCategoryManager && (
          <div className="p-4 sm:p-6 space-y-4">
            <form
              onSubmit={e => {
                e.preventDefault()
                if (newCategoryName.trim()) {
                  createCategoryMutation.mutate({ name: newCategoryName.trim(), color: newCategoryColor })
                }
              }}
              className="flex gap-3"
            >
              <input
                type="color"
                value={newCategoryColor}
                onChange={e => setNewCategoryColor(e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                title="Choose category color"
              />
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
                  <div key={cat.id} className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded">
                    {editingCategoryId === cat.id ? (
                      <form
                        onSubmit={e => {
                          e.preventDefault()
                          if (editingCategoryName.trim()) {
                            updateCategoryMutation.mutate({
                              id: cat.id,
                              name: editingCategoryName.trim(),
                              color: editingCategoryColor,
                            })
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="color"
                          value={editingCategoryColor}
                          onChange={e => setEditingCategoryColor(e.target.value)}
                          className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={e => setEditingCategoryName(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button type="submit" className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(null)
                            setEditingCategoryName("")
                            setEditingCategoryColor("")
                          }}
                          className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm text-gray-900 dark:text-white">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCategoryId(cat.id)
                              setEditingCategoryName(cat.name)
                              setEditingCategoryColor(cat.color)
                            }}
                            className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Edit category"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCategoryMutation.mutate(cat.id)}
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete category"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    )}
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Your Feeds ({feeds?.length || 0})</h2>
          {feeds && feeds.length > 0 && (
            <button
              onClick={() => refreshAllFeedsMutation.mutate()}
              disabled={isRefreshingAll || isDemoMode}
              className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
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
            <li className="px-4 sm:px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading feeds...</li>
          ) : feeds?.length === 0 ? (
            <li className="px-4 sm:px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No feeds added yet. Add your first feed above!</li>
          ) : (
            feeds?.map(feed => (
              <li key={feed.id} className="px-4 sm:px-6 py-4">
                {editingFeedId === feed.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feed Title</label>
                      <input
                        type="text"
                        value={editingFeedTitle}
                        onChange={e => setEditingFeedTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm min-h-[44px]"
                        placeholder="Feed title"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Feed URL</label>
                      <input
                        type="url"
                        value={editingFeedUrl}
                        onChange={e => setEditingFeedUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm min-h-[44px]"
                        placeholder="https://example.com/feed.xml"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={editFeedMutation.isPending || !editingFeedUrl.trim() || !editingFeedTitle.trim()}
                        className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm font-medium rounded text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      >
                        {editFeedMutation.isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={editFeedMutation.isPending}
                        className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 min-h-[44px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="relative">
                    {/* Action buttons - top right on mobile, right side on desktop */}
                    <div className="absolute top-0 right-0 flex items-center gap-1 sm:gap-2">
                      {/* Full-text fetch toggle */}
                      <button
                        onClick={() => toggleFullTextMutation.mutate({ feedId: feed.id, enabled: !feed.full_text_enabled })}
                        disabled={toggleFullTextMutation.isPending}
                        className={`p-2 rounded transition-colors disabled:opacity-50 border ${
                          feed.full_text_enabled
                            ? "border-primary-400 dark:border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30"
                            : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        }`}
                        title={feed.full_text_enabled ? "Full-text fetch ON — click to disable" : "Enable full-text fetch for this feed"}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </button>
                      {feed.status === "error" && (
                        <button
                          onClick={() => validateFeedMutation.mutate(feed)}
                          disabled={validatingFeedId === feed.id}
                          className="p-2 border border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded transition-colors disabled:opacity-50"
                          title="Test if feed is working"
                        >
                          <svg
                            className={`w-4 h-4 sm:w-5 sm:h-5 ${validatingFeedId === feed.id ? "animate-spin" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => refreshFeedMutation.mutate(feed)}
                        disabled={refreshingFeedId === feed.id || refreshingFeedIds.has(feed.id)}
                        className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                        title="Refresh feed"
                      >
                        <svg
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${refreshingFeedId === feed.id || refreshingFeedIds.has(feed.id) ? "animate-spin" : ""}`}
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
                      </button>
                      <button
                        onClick={() => handleEditClick(feed)}
                        className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
                        title="Edit feed"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(feed)}
                        disabled={deletingFeedId === feed.id}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                        title="Delete feed"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Feed content - full width with right padding to avoid button overlap */}
                    <div className="pr-36 sm:pr-40">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{feed.title}</p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{feed.url}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                            feed.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {feed.status}
                        </span>
                        {feed.last_fetched && (
                          <span className="text-xs">Last fetched {formatDistanceToNow(new Date(feed.last_fetched), { addSuffix: true })}</span>
                        )}
                        <select
                          value={feed.category_id || ""}
                          onChange={e => {
                            const value = e.target.value
                            updateFeedCategoryMutation.mutate({
                              feedId: feed.id,
                              categoryId: value === "" ? null : value,
                            })
                          }}
                          className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 min-h-[32px]"
                        >
                          <option value="">Uncategorized</option>
                          {categories?.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        {/* Keyword filter toggle */}
                        {canUseFilters ? (
                          <button
                            onClick={() => toggleFilterPanel(feed.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border transition-colors min-h-[32px] ${
                              expandedFilterFeedId === feed.id
                                ? "border-primary-400 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                                : filters.some(f => f.feed_id === feed.id)
                                  ? "border-primary-300 text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-700"
                                  : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                            title="Manage keyword filters for this feed"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                              />
                            </svg>
                            Filters
                            {(() => {
                              const { include, exclude } = getFiltersForFeed(feed.id)
                              const count = include.reduce((s, f) => s + f.keywords.length, 0) + exclude.reduce((s, f) => s + f.keywords.length, 0)
                              return count > 0 ? <span className="ml-0.5 font-semibold">({count})</span> : null
                            })()}
                          </button>
                        ) : (
                          <Link
                            to="/settings"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 min-h-[32px]"
                            title="Upgrade to Creator to use keyword filters"
                          >
                            🔒 Filters
                          </Link>
                        )}
                      </div>
                      {feed.error_message && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                          <span className="font-medium">Error:</span> {feed.error_message}
                        </div>
                      )}
                    </div>
                    {/* Keyword filter panel */}
                    {expandedFilterFeedId === feed.id &&
                      (() => {
                        const { include: includeFilters, exclude: excludeFilters } = getFiltersForFeed(feed.id)
                        return (
                          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-3 space-y-3">
                            {/* Include keywords */}
                            <div>
                              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">✅ Show only articles containing…</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {includeFilters.flatMap(f =>
                                  f.keywords.map(kw => (
                                    <span
                                      key={`${f.id}-${kw}`}
                                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700"
                                    >
                                      {kw}
                                      <button
                                        onClick={() => removeKeyword({ filterId: f.id, keyword: kw })}
                                        className="ml-0.5 text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200"
                                        title="Remove keyword"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  )),
                                )}
                                {includeFilters.length === 0 && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">No include keywords — showing all articles</span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={filterIncludeInput}
                                  onChange={e => setFilterIncludeInput(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && handleAddKeyword(feed.id, "include")}
                                  placeholder="Add keyword…"
                                  className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-green-400"
                                />
                                <button
                                  onClick={() => handleAddKeyword(feed.id, "include")}
                                  className="px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white font-medium"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                            {/* Exclude keywords */}
                            <div>
                              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5">🚫 Hide articles containing…</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {excludeFilters.flatMap(f =>
                                  f.keywords.map(kw => (
                                    <span
                                      key={`${f.id}-${kw}`}
                                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700"
                                    >
                                      {kw}
                                      <button
                                        onClick={() => removeKeyword({ filterId: f.id, keyword: kw })}
                                        className="ml-0.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200"
                                        title="Remove keyword"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  )),
                                )}
                                {excludeFilters.length === 0 && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">No exclude keywords — hiding nothing</span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={filterExcludeInput}
                                  onChange={e => setFilterExcludeInput(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && handleAddKeyword(feed.id, "exclude")}
                                  placeholder="Add keyword…"
                                  className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-red-400"
                                />
                                <button
                                  onClick={() => handleAddKeyword(feed.id, "exclude")}
                                  className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white font-medium"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                  </div>
                )}
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
