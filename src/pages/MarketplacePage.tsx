import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { MarketplaceSubscription, MarketplaceCollection, Feed } from "../types/database"
import CollectionCard from "../components/CollectionCard"
import { useAuth } from "../hooks/useAuth"

type SortOption = "popular" | "newest" | "feeds"

export default function MarketplacePage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("popular")

  // Fetch all listed collections with feed counts and creator info
  const { data: collections, isLoading } = useQuery({
    queryKey: ["marketplace-collections"],
    queryFn: async () => {
      // Fetch collections with sources count
      const { data: collectionsData, error: collectionsError } = await supabase
        .from("feed_collections")
        .select(
          `
          *,
          feed_collection_sources (
            feed:feeds (
              id,
              title,
              url
            )
          )
        `,
        )
        .eq("marketplace_listed", true)

      if (collectionsError) throw collectionsError

      // Transform data to include feed_count and sources
      const enrichedCollections: MarketplaceCollection[] = (collectionsData || []).map(c => ({
        ...c,
        feed_count: c.feed_collection_sources?.length || 0,
        sources:
          c.feed_collection_sources?.map((s: { feed: Pick<Feed, "id" | "title" | "url"> }) => ({
            feed: s.feed,
          })) || [],
        // Creator info will be fetched separately or use placeholder
        creator_name: undefined,
        creator_email: undefined,
      }))

      return enrichedCollections
    },
  })

  // Fetch user's subscriptions to know status
  const { data: subscriptions } = useQuery({
    queryKey: ["marketplace-subscriptions"],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase.from("marketplace_subscriptions").select("*").eq("subscriber_id", user.id)

      if (error) throw error
      return data as MarketplaceSubscription[]
    },
    enabled: !!user,
  })

  const subscribedCollectionIds = new Set(subscriptions?.map(s => s.collection_id))

  // Get all unique tags
  const allTags = Array.from(new Set(collections?.flatMap(c => c.tags || []) || [])).sort()

  // Filter and sort collections
  const filteredCollections = collections
    ?.filter(collection => {
      const matchesSearch =
        collection.name.toLowerCase().includes(searchTerm.toLowerCase()) || collection.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesTag = selectedTag ? collection.tags?.includes(selectedTag) : true

      return matchesSearch && matchesTag
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case "feeds":
          return (b.feed_count || 0) - (a.feed_count || 0)
        case "popular":
        default:
          return (b.subscribers_count || 0) - (a.subscribers_count || 0)
      }
    })

  // Get featured collections (not affected by search/filter)
  const featuredCollections = collections?.filter(c => c.is_featured) || []

  // Non-featured filtered collections
  const regularCollections = filteredCollections?.filter(c => !c.is_featured) || []

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feed Marketplace</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Discover and subscribe to curated feed collections from the community.</p>
      </div>

      {/* Featured Collections Section */}
      {featuredCollections.length > 0 && !searchTerm && !selectedTag && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Staff Picks</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCollections.map(collection => (
              <CollectionCard key={collection.id} collection={collection} isSubscribed={subscribedCollectionIds.has(collection.id)} isFeatured />
            ))}
          </div>
        </div>
      )}

      {/* Search, Filter, and Sort Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="md:w-1/4 relative">
          <select
            value={selectedTag || ""}
            onChange={e => setSelectedTag(e.target.value || null)}
            className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div className="md:w-1/4 relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="feeds">Most Feeds</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* All Collections Section */}
      {(searchTerm || selectedTag) && <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Search Results</h2>}
      {!searchTerm && !selectedTag && featuredCollections.length > 0 && (
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All Collections</h2>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (searchTerm || selectedTag ? filteredCollections : regularCollections)?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(searchTerm || selectedTag ? filteredCollections : regularCollections)?.map(collection => (
            <CollectionCard key={collection.id} collection={collection} isSubscribed={subscribedCollectionIds.has(collection.id)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No collections found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
