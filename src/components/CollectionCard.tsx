import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { FeedCollection } from "../types/database"
import toast from "react-hot-toast"
import { useAuth } from "../hooks/useAuth"

interface CollectionCardProps {
  collection: FeedCollection
  isSubscribed: boolean
}

export default function CollectionCard({ collection, isSubscribed }: CollectionCardProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to subscribe")
      
      const { error } = await supabase
        .from("marketplace_subscriptions")
        .insert({
          subscriber_id: user.id,
          collection_id: collection.id
        })
      
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(`Subscribed to ${collection.name}`)
      queryClient.invalidateQueries({ queryKey: ["marketplace-subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["marketplace-collections"] })
      queryClient.invalidateQueries({ queryKey: ["sidebar-subscriptions"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to unsubscribe")

      const { error } = await supabase
        .from("marketplace_subscriptions")
        .delete()
        .eq("subscriber_id", user.id)
        .eq("collection_id", collection.id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success(`Unsubscribed from ${collection.name}`)
      queryClient.invalidateQueries({ queryKey: ["marketplace-subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["marketplace-collections"] })
      queryClient.invalidateQueries({ queryKey: ["sidebar-subscriptions"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleToggleSubscription = () => {
    setLoading(true)
    if (isSubscribed) {
      unsubscribeMutation.mutate(undefined, { onSettled: () => setLoading(false) })
    } else {
      subscribeMutation.mutate(undefined, { onSettled: () => setLoading(false) })
    }
  }

  const isOwner = user?.id === collection.user_id

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate" title={collection.name}>
            {collection.name}
          </h3>
          {isOwner && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded">
              You
            </span>
          )}
        </div>
        
        {collection.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
            {collection.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {collection.tags && collection.tags.length > 0 ? (
            collection.tags.map(tag => (
              <span key={tag} className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
                #{tag}
              </span>
            ))
          ) : (
             <span className="text-xs text-gray-400 italic">No tags</span>
          )}
        </div>
        
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-auto pt-2">
           <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>{collection.subscribers_count || 0} subscribers</span>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <button
          onClick={handleToggleSubscription}
          disabled={loading || isOwner}
          className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            isOwner
              ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              : isSubscribed
              ? "bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : isOwner ? (
            "Your Collection"
          ) : isSubscribed ? (
            "Unsubscribe"
          ) : (
            "Subscribe"
          )}
        </button>
      </div>
    </div>
  )
}
