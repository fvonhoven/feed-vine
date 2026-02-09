import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import type { MarketplaceCollection } from "../types/database"
import toast from "react-hot-toast"
import { useAuth } from "../hooks/useAuth"

interface CollectionCardProps {
  collection: MarketplaceCollection
  isSubscribed: boolean
  isFeatured?: boolean
}

export default function CollectionCard({ collection, isSubscribed, isFeatured }: CollectionCardProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to subscribe")

      const { error } = await supabase.from("marketplace_subscriptions").insert({
        subscriber_id: user.id,
        collection_id: collection.id,
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
    },
  })

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to unsubscribe")

      const { error } = await supabase.from("marketplace_subscriptions").delete().eq("subscriber_id", user.id).eq("collection_id", collection.id)

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
    },
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
  const feedCount = collection.feed_count || collection.sources?.length || 0
  const creatorName = collection.creator_name || (isOwner ? "You" : "Anonymous")

  return (
    <>
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border shadow-sm hover:shadow-md transition-shadow flex flex-col h-full ${
          isFeatured
            ? "border-yellow-400 dark:border-yellow-500 ring-2 ring-yellow-100 dark:ring-yellow-900/30"
            : "border-gray-200 dark:border-gray-700"
        }`}
      >
        <div className="p-6 flex-1">
          {/* Header with title and badges */}
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate flex-1" title={collection.name}>
              {collection.name}
            </h3>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              {isFeatured && (
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Featured
                </span>
              )}
              {isOwner && !isFeatured && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded">You</span>
              )}
            </div>
          </div>

          {/* Creator info */}
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-[10px] font-bold">
              {creatorName.charAt(0).toUpperCase()}
            </div>
            <span>by {creatorName}</span>
          </div>

          {collection.description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{collection.description}</p>}

          <div className="flex flex-wrap gap-2 mb-4">
            {collection.tags && collection.tags.length > 0 ? (
              collection.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">No tags</span>
            )}
            {collection.tags && collection.tags.length > 3 && <span className="text-xs text-gray-400">+{collection.tags.length - 3} more</span>}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-auto pt-2">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>{collection.subscribers_count || 0} subscribers</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"
                />
              </svg>
              <span>{feedCount} feeds</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="flex gap-2">
            {/* Preview button */}
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 py-2 px-3 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              Preview
            </button>
            {/* Subscribe button */}
            <button
              onClick={handleToggleSubscription}
              disabled={loading || isOwner}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
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
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </span>
              ) : isOwner ? (
                "Yours"
              ) : isSubscribed ? (
                "Unsubscribe"
              ) : (
                "Subscribe"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={() => setShowPreview(false)}
            ></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white" id="modal-title">
                      {collection.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {feedCount} feeds • {collection.subscribers_count || 0} subscribers
                    </p>
                  </div>
                  <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {collection.description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{collection.description}</p>}

                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Feeds in this collection:</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {collection.sources && collection.sources.length > 0 ? (
                    collection.sources.map((source, index) => (
                      <div key={source.feed?.id || index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{source.feed?.title || "Unknown Feed"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{source.feed?.url || ""}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No feeds in this collection yet.</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  onClick={() => {
                    handleToggleSubscription()
                    setShowPreview(false)
                  }}
                  disabled={loading || isOwner}
                  className={`w-full sm:w-auto inline-flex justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    isOwner
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                      : isSubscribed
                        ? "bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500"
                        : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {isOwner ? "Your Collection" : isSubscribed ? "Unsubscribe" : "Subscribe"}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
