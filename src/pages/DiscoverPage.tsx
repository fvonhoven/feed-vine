import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import { popularFeeds, feedCategories } from "../data/popularFeeds"
import toast from "react-hot-toast"
import { fetchAndSaveArticles } from "../lib/rssFetcher"

export default function DiscoverPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const queryClient = useQueryClient()

  const addFeedMutation = useMutation({
    mutationFn: async (feedUrl: string) => {
      if (isDemoMode) {
        throw new Error("Cannot add feeds in demo mode. Please sign in with Supabase credentials.")
      }

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not authenticated")

      // Check if feed already exists
      const { data: existing } = await supabase.from("feeds").select("id").eq("url", feedUrl).maybeSingle()

      if (existing) {
        throw new Error("You've already added this feed")
      }

      // Add the feed
      const feed = popularFeeds.find(f => f.url === feedUrl)
      if (!feed) throw new Error("Feed not found")

      const { data: newFeed, error } = await supabase
        .from("feeds")
        .insert({
          user_id: user.user.id,
          url: feed.url,
          title: feed.title,
          status: "active",
        })
        .select()
        .single()

      if (error) throw error
      return { feed, newFeed }
    },
    onSuccess: async ({ feed, newFeed }) => {
      toast.success(`Added ${feed.title}! Fetching articles...`)
      queryClient.invalidateQueries({ queryKey: ["feeds"] })

      // Fetch articles from the RSS feed
      try {
        const count = await fetchAndSaveArticles(newFeed.id, newFeed.url)
        queryClient.invalidateQueries({ queryKey: ["articles"] })
        toast.success(`Successfully fetched ${count} articles!`)
      } catch (error) {
        toast.error("Failed to fetch articles from feed")
        console.error(error)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const filteredFeeds = popularFeeds.filter(feed => {
    const matchesCategory = selectedCategory === "all" || feed.category === selectedCategory
    const matchesSearch =
      searchQuery === "" ||
      feed.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feed.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discover Feeds</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Browse and add popular RSS feeds to your collection</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search feeds..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-primary-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            All
          </button>
          {feedCategories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-primary-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeeds.map(feed => (
          <div
            key={feed.url}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{feed.title}</h3>
                <span className="inline-block px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded">
                  {feed.category}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{feed.description}</p>
            <button
              onClick={() => addFeedMutation.mutate(feed.url)}
              disabled={addFeedMutation.isPending}
              className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {addFeedMutation.isPending ? "Adding..." : "Add Feed"}
            </button>
          </div>
        ))}
      </div>

      {filteredFeeds.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No feeds found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try a different search or category</p>
        </div>
      )}
    </div>
  )
}
