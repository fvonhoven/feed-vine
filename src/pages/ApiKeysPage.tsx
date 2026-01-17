import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"
import { useSubscription } from "../hooks/useSubscription"
import { Link } from "react-router-dom"
import ApiUsageStats from "../components/ApiUsageStats"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
  expires_at: string | null
  is_active: boolean
}

export default function ApiKeysPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { hasFeature } = useSubscription()

  const hasApiAccess = hasFeature("apiAccess")

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      if (isDemoMode || !hasApiAccess) {
        return []
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch API keys")
      }

      const result = await response.json()
      return result.data as ApiKey[]
    },
    enabled: hasApiAccess && !isDemoMode,
  })

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Connect Supabase to create API keys")
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || "Failed to create API key")
      }

      const result = await response.json()
      return result.data
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      setNewApiKey(data.api_key)
      setShowCreateForm(false)
      setNewKeyName("")
      toast.success("API key created successfully!")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create API key")
    },
  })

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      if (isDemoMode) {
        throw new Error("Demo mode: Cannot revoke API keys")
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-keys/${keyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to revoke API key")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      toast.success("API key revoked successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to revoke API key")
    },
  })

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name")
      return
    }
    createKeyMutation.mutate(newKeyName)
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success("API key copied to clipboard!")
  }

  if (!hasApiAccess) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">API Access Requires Premium Plan</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Upgrade to Premium to access the FeedVine API and integrate with your applications.</p>
          <Link
            to="/pricing"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Upgrade to Premium
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">API Keys</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your API keys for programmatic access to FeedVine.</p>
      </div>

      {/* API Usage Stats */}
      <ApiUsageStats />

      {/* New API Key Display */}
      {newApiKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-1">API Key Created!</h3>
              <p className="text-sm text-green-700 dark:text-green-300">Save this key now. You won't be able to see it again!</p>
            </div>
            <button onClick={() => setNewApiKey(null)} className="text-green-600 hover:text-green-700 dark:text-green-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-gray-800 px-4 py-3 rounded border border-green-300 dark:border-green-700 text-sm font-mono break-all">
              {newApiKey}
            </code>
            <button
              onClick={() => handleCopyKey(newApiKey)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded font-medium transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Create New Key Button */}
      <div className="mb-6">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Create New API Key
          </button>
        ) : (
          <form onSubmit={handleCreateKey} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New API Key</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Server, Mobile App"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createKeyMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {createKeyMutation.isPending ? "Creating..." : "Create Key"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewKeyName("")
                }}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* API Keys List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your API Keys</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : apiKeys && apiKeys.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {apiKeys.map(key => (
              <div key={key.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{key.name}</h3>
                      {!key.is_active && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-1 rounded">Revoked</span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>
                        <span className="font-mono">{key.key_prefix}</span>
                      </p>
                      <p>Created {formatDistanceToNow(new Date(key.created_at), { addSuffix: true })}</p>
                      {key.last_used_at && <p>Last used {formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })}</p>}
                      {!key.last_used_at && <p className="text-gray-500 dark:text-gray-500">Never used</p>}
                    </div>
                  </div>
                  {key.is_active && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to revoke "${key.name}"? This action cannot be undone.`)) {
                          revokeKeyMutation.mutate(key.id)
                        }
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-4">No API keys yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Create your first API key to get started with the FeedVine API.</p>
          </div>
        )}
      </div>

      {/* API Documentation Link */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">API Documentation</h3>
            <p className="text-blue-700 dark:text-blue-300 mb-3">
              Learn how to use the FeedVine API to integrate with your applications, automate workflows, and build custom integrations.
            </p>
            <a
              href="https://github.com/yourusername/feedvine/blob/main/docs/API_REFERENCE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              View API Documentation →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
