import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { Webhook, WebhookEventType, FeedCollection, Feed } from "../types/database"
import toast from "react-hot-toast"
import { formatDistanceToNow } from "date-fns"
import { useSubscription } from "../hooks/useSubscription"
import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"

const EVENT_TYPES: { value: WebhookEventType; label: string; description: string }[] = [
  { value: "new_article", label: "New Article", description: "Triggered when new articles are fetched" },
  { value: "feed_error", label: "Feed Error", description: "Triggered when a feed fails to fetch" },
  { value: "collection_updated", label: "Collection Updated", description: "Triggered when a collection is modified" },
]

const emptyForm = () => ({
  name: "",
  url: "",
  secret: "",
  event_types: ["new_article"] as WebhookEventType[],
  feed_id: "",
  collection_id: "",
})

export default function WebhooksPage() {
  const { user } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null)
  const [editingHadSecret, setEditingHadSecret] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const queryClient = useQueryClient()
  const { hasFeature, isLoading: subscriptionLoading } = useSubscription()

  const hasWebhookAccess = hasFeature("webhooks")

  // Fetch webhooks - using type assertion since webhooks table isn't in generated types yet
  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      if (isDemoMode || !hasWebhookAccess) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("webhooks").select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data as Webhook[]
    },
    enabled: hasWebhookAccess && !isDemoMode,
  })

  // Fetch feeds for dropdown
  const { data: feeds } = useQuery({
    queryKey: ["feeds-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feeds").select("id, title").order("title")
      if (error) throw error
      return data as Pick<Feed, "id" | "title">[]
    },
    enabled: hasWebhookAccess && showCreateForm,
  })

  // Fetch collections for dropdown
  const { data: collections } = useQuery({
    queryKey: ["collections-list"],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase.from("feed_collections").select("id, name").eq("user_id", user.id).order("name")
      if (error) throw error
      return data as Pick<FeedCollection, "id" | "name">[]
    },
    enabled: hasWebhookAccess && showCreateForm && !!user,
  })

  // Create webhook mutation - using type assertion since webhooks table isn't in generated types yet
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isDemoMode) throw new Error("Demo mode: Cannot create webhooks")
      if (!user?.id) throw new Error("User not authenticated")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: webhook, error } = await (supabase as any)
        .from("webhooks")
        .insert({
          user_id: user.id,
          name: data.name,
          url: data.url,
          secret: data.secret || null,
          event_types: data.event_types,
          feed_id: data.feed_id || null,
          collection_id: data.collection_id || null,
        })
        .select()
        .single()
      if (error) throw error
      return webhook
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
      setShowCreateForm(false)
      setEditingWebhookId(null)
      setEditingHadSecret(false)
      setFormData(emptyForm())
      toast.success("Webhook created successfully!")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      if (isDemoMode) throw new Error("Demo mode: Cannot update webhooks")
      if (!user?.id) throw new Error("User not authenticated")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: Record<string, unknown> = {
        name: data.name.trim(),
        url: data.url.trim(),
        event_types: data.event_types,
        feed_id: data.feed_id || null,
        collection_id: data.collection_id || null,
      }
      if (data.secret.trim()) row.secret = data.secret.trim()
      const { error } = await (supabase as any).from("webhooks").update(row).eq("id", id).eq("user_id", user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
      setShowCreateForm(false)
      setEditingWebhookId(null)
      setEditingHadSecret(false)
      setFormData(emptyForm())
      toast.success("Webhook updated")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Delete webhook mutation - using type assertion
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("webhooks").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
      toast.success("Webhook deleted")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Toggle webhook active state - using type assertion
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("webhooks").update({ is_active }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
      toast.success("Webhook updated")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // Send test webhook
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null)
  const testMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      setTestingWebhookId(webhookId)
      const { data, error } = await supabase.functions.invoke("test-webhook", {
        body: { webhookId },
      })
      if (error) throw error
      if (!data?.success) {
        const errField = data?.error
        const detail =
          typeof errField === "string"
            ? errField
            : errField && typeof errField === "object" && "message" in errField
              ? String((errField as { message: string }).message)
              : "Webhook test failed"
        throw new Error(detail)
      }
      return data
    },
    onSuccess: data => {
      setTestingWebhookId(null)
      queryClient.invalidateQueries({ queryKey: ["webhooks"] })
      toast.success(`Test sent — your endpoint returned HTTP ${data.statusCode}`)
    },
    onError: (error: unknown) => {
      setTestingWebhookId(null)
      toast.error(`Test failed: ${error instanceof Error ? error.message : String(error)}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error("Name and URL are required")
      return
    }
    if (formData.event_types.length === 0) {
      toast.error("Select at least one event type")
      return
    }
    try {
      new URL(formData.url)
    } catch {
      toast.error("Please enter a valid URL")
      return
    }
    if (editingWebhookId) {
      updateMutation.mutate({ id: editingWebhookId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const openCreateForm = () => {
    setEditingWebhookId(null)
    setEditingHadSecret(false)
    setFormData(emptyForm())
    setShowCreateForm(true)
  }

  const openEditForm = (webhook: Webhook) => {
    setEditingWebhookId(webhook.id)
    setEditingHadSecret(!!webhook.secret)
    setFormData({
      name: webhook.name,
      url: webhook.url,
      secret: "",
      event_types: webhook.event_types.length > 0 ? webhook.event_types : ["new_article"],
      feed_id: webhook.feed_id ?? "",
      collection_id: webhook.collection_id ?? "",
    })
    setShowCreateForm(true)
  }

  const closeForm = () => {
    setShowCreateForm(false)
    setEditingWebhookId(null)
    setEditingHadSecret(false)
    setFormData(emptyForm())
  }

  const toggleEventType = (eventType: WebhookEventType) => {
    setFormData(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventType) ? prev.event_types.filter(e => e !== eventType) : [...prev.event_types, eventType],
    }))
  }

  // Avoid paywall flash: until subscription loads, plan defaults to FREE and webhooks reads false.
  if (user && subscriptionLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" aria-label="Loading" />
      </div>
    )
  }

  if (!hasWebhookAccess) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-yellow-600 dark:text-yellow-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Webhooks Require Creator Plan</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upgrade to Creator to use webhooks and integrate FeedVine with Zapier, Make, and other automation tools.
          </p>
          <Link to="/pricing" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg">
            Upgrade to Creator
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Webhooks</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Send HTTP notifications to external services when events occur. Perfect for Zapier, Make, or custom integrations.
        </p>
      </div>

      {/* Create Webhook Button/Form */}
      <div className="mb-6">
        {!showCreateForm ? (
          <button
            onClick={openCreateForm}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Create New Webhook
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingWebhookId ? "Edit Webhook" : "Create New Webhook"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Zapier Integration"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://hooks.zapier.com/..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secret (optional, for{" "}
                <a
                  href="https://developer.mozilla.org/en-US/docs/Glossary/HMAC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  HMAC signature verification ↗
                </a>
                )
              </label>
              <input
                type="text"
                value={formData.secret}
                onChange={e => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                placeholder={editingWebhookId ? "Leave blank to keep current secret" : "Your webhook secret"}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
              {editingWebhookId && editingHadSecret && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">A secret is already set. Enter a new value to replace it.</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Types *</label>
              <div className="space-y-2">
                {EVENT_TYPES.map(event => (
                  <label key={event.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.event_types.includes(event.value)}
                      onChange={() => toggleEventType(event.value)}
                      className="mt-1 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="text-gray-900 dark:text-white font-medium">{event.label}</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{event.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Feed (optional)</label>
                <select
                  value={formData.feed_id}
                  onChange={e => setFormData(prev => ({ ...prev, feed_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All feeds</option>
                  {feeds?.map(feed => (
                    <option key={feed.id} value={feed.id}>
                      {feed.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Collection (optional)</label>
                <select
                  value={formData.collection_id}
                  onChange={e => setFormData(prev => ({ ...prev, collection_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All collections</option>
                  {collections?.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? editingWebhookId
                    ? "Saving..."
                    : "Creating..."
                  : editingWebhookId
                    ? "Save changes"
                    : "Create Webhook"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Webhooks List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Webhooks</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : webhooks && webhooks.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {webhooks.map(webhook => (
              <div key={webhook.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">{webhook.name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          webhook.is_active
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {webhook.is_active ? "Active" : "Paused"}
                      </span>
                      {webhook.failure_count > 0 && (
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-1 rounded">
                          {webhook.failure_count} failures
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate mb-2">{webhook.url}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {webhook.event_types.map(type => (
                        <span key={type} className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded">
                          {type}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {webhook.last_triggered_at ? (
                        <>Last triggered {formatDistanceToNow(new Date(webhook.last_triggered_at), { addSuffix: true })}</>
                      ) : (
                        <>Never triggered</>
                      )}
                      {webhook.last_status_code && (
                        <span className={webhook.last_status_code >= 200 && webhook.last_status_code < 300 ? "text-green-600" : "text-red-600"}>
                          {" "}
                          • Status: {webhook.last_status_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => openEditForm(webhook)}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => testMutation.mutate(webhook.id)}
                      disabled={testingWebhookId === webhook.id}
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {testingWebhookId === webhook.id ? "Sending..." : "Send Test"}
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate({ id: webhook.id, is_active: !webhook.is_active })}
                      className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium"
                    >
                      {webhook.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete webhook "${webhook.name}"?`)) deleteMutation.mutate(webhook.id)
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-4">No webhooks yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Create your first webhook to start receiving notifications.</p>
          </div>
        )}
      </div>

      {/* Documentation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Webhook payload format</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
          Every delivery is a JSON POST with <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">event</code>,{" "}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">timestamp</code> (ISO 8601), and{" "}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">data</code>. Headers include{" "}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">X-FeedVine-Event</code> matching <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">event</code>
          .
        </p>

        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-4 mb-1">new_article</h4>
        <pre className="bg-white dark:bg-gray-800 rounded p-4 text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
          {`{
  "event": "new_article",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "feed": { "id": "...", "title": "...", "url": "..." },
    "articles": [
      { "title": "...", "url": "...", "description": "...", "category": "..." }
    ],
    "count": 5
  }
}`}
        </pre>

        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-4 mb-1">feed_error</h4>
        <pre className="bg-white dark:bg-gray-800 rounded p-4 text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
          {`{
  "event": "feed_error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "feed": { "id": "...", "title": "...", "url": "..." },
    "error": { "message": "HTTP error! status: 404" }
  }
}`}
        </pre>

        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-4 mb-1">collection_updated</h4>
        <pre className="bg-white dark:bg-gray-800 rounded p-4 text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
          {`{
  "event": "collection_updated",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "collection": {
      "id": "...",
      "name": "...",
      "slug": "...",
      "description": "...",
      "is_public": true,
      "marketplace_listed": false,
      "tags": ["..."],
      "output_format": "rss",
      "team_id": null
    }
  }
}`}
        </pre>

        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-4 mb-1">test</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
          <strong>Send Test</strong> only: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">event</code> is{" "}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">test</code>; <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">data</code> includes{" "}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">message</code>, <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">webhook: {"{ id, name }"}</code>, and{" "}
          <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">test: true</code>.
        </p>

        <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
          If you provide a secret, we'll include an <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">X-FeedVine-Signature</code> header
          with an{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Glossary/HMAC"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-900 dark:hover:text-blue-100"
          >
            HMAC-SHA256
          </a>{" "}
          signature so you can verify the request came from FeedVine.
        </p>
      </div>
    </div>
  )
}
