import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { FeedCollection, MarketplaceSubscription } from "../types/database"
import CollectionCard from "../components/CollectionCard"
import { useAuth } from "../hooks/useAuth"

export default function MarketplacePage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Fetch all listed collections
  const { data: collections, isLoading } = useQuery({
    queryKey: ["marketplace-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_collections")
        .select("*")
        .eq("marketplace_listed", true)
        .order("subscribers_count", { ascending: false })
      
      if (error) throw error
      return data as FeedCollection[]
    }
  })

  // Fetch user's subscriptions to know status
  const { data: subscriptions } = useQuery({
    queryKey: ["marketplace-subscriptions"],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from("marketplace_subscriptions")
        .select("*")
        .eq("subscriber_id", user.id)
      
      if (error) throw error
      return data as MarketplaceSubscription[]
    },
    enabled: !!user
  })

  const subscribedCollectionIds = new Set(subscriptions?.map(s => s.collection_id))

  // Get all unique tags
  const allTags = Array.from(new Set(collections?.flatMap(c => c.tags || []) || [])).sort()

  // Filter collections
  const filteredCollections = collections?.filter(collection => {
    const matchesSearch = 
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTag = selectedTag ? collection.tags?.includes(selectedTag) : true

    return matchesSearch && matchesTag
  })

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feed Marketplace</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Discover and subscribe to curated feed collections from the community.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <input
             type="text"
             placeholder="Search collections..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="md:w-1/3 relative">
            <select
              value={selectedTag || ""}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredCollections && filteredCollections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map(collection => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              isSubscribed={subscribedCollectionIds.has(collection.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No collections found matching your criteria.
          </p>
        </div>
      )}
    </div>
  )
}
