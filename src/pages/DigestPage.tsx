import { useState, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format as dateFormat, subDays, subHours } from "date-fns"
import { supabase, isDemoMode } from "../lib/supabase"
import type { ArticleWithFeed, ScheduledDigest, DigestHistory } from "../types/database"
import { useSubscription } from "../hooks/useSubscription"
import toast from "react-hot-toast"
import { Link } from "react-router-dom"

type DateRange = "24h" | "7d" | "30d"
type ExportFormat = "markdown" | "html" | "text"
type PageTab = "builder" | "schedules" | "history"

// ── Output generators ────────────────────────────────────────────────────────

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!["http:", "https:"].includes(u.protocol)) return false
    const host = u.hostname.toLowerCase()
    if (host === "localhost" || host === "127.0.0.1") return false
    if (host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.")) return false
    return true
  } catch {
    return false
  }
}

function generateMarkdown(title: string, articles: ArticleWithFeed[]): string {
  const date = dateFormat(new Date(), "MMMM d, yyyy")
  let md = `# ${title.replace(/[#*_`[\]]/g, " ")}\n\n*${date}*\n\n---\n\n`
  articles.forEach(a => {
    const safeUrl = isSafeUrl(a.url) ? a.url : "#"
    const safeTitle = a.title.replace(/[\[\]()]/g, " ")
    md += `## [${safeTitle}](${safeUrl})\n\n`
    if (a.description) md += `${stripHtml(a.description)}\n\n`
    md += `*${a.feed.title} · ${dateFormat(new Date(a.published_at), "MMM d")}*\n\n---\n\n`
  })
  return md
}

function generateHTML(title: string, articles: ArticleWithFeed[]): string {
  const date = dateFormat(new Date(), "MMMM d, yyyy")
  let html = `<h1 style="font-family:sans-serif;color:#111;">${escapeHtml(title)}</h1>\n`
  html += `<p style="color:#888;font-size:14px;">${date}</p>\n<hr>\n`
  articles.forEach(a => {
    const safeUrl = isSafeUrl(a.url) ? a.url : "#"
    html += `<h2 style="font-family:sans-serif;"><a href="${escapeHtml(safeUrl)}" style="color:#0070f3;text-decoration:none;">${escapeHtml(a.title)}</a></h2>\n`
    if (a.description) html += `<p style="color:#444;line-height:1.6;">${escapeHtml(stripHtml(a.description))}</p>\n`
    html += `<p style="color:#888;font-size:12px;">${escapeHtml(a.feed.title)} · ${dateFormat(new Date(a.published_at), "MMM d")}</p>\n<hr>\n`
  })
  return html
}

function generateText(title: string, articles: ArticleWithFeed[]): string {
  const date = dateFormat(new Date(), "MMMM d, yyyy")
  let text = `${title}\n${date}\n${"=".repeat(50)}\n\n`
  articles.forEach((a, i) => {
    text += `${i + 1}. ${a.title}\n   ${a.url}\n`
    if (a.description) text += `   ${stripHtml(a.description).slice(0, 160)}...\n`
    text += `   ${a.feed.title} · ${dateFormat(new Date(a.published_at), "MMM d")}\n\n`
  })
  return text
}

// ── Sub-components ───────────────────────────────────────────────────────────

function UpgradePrompt() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-10">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Newsletter Digest Builder</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Compile your top articles into a formatted digest you can paste straight into Beehiiv, Substack, ConvertKit, or Ghost. Available on Creator
          and above.
        </p>
        <Link
          to="/pricing"
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Upgrade to Creator →
        </Link>
      </div>
    </div>
  )
}

interface ControlsProps {
  dateRange: DateRange
  setDateRange: (v: DateRange) => void
  collectionId: string
  setCollectionId: (v: string) => void
  collections: Array<{ id: string; name: string }> | undefined
  digestTitle: string
  setDigestTitle: (v: string) => void
  limit: number
  setLimit: (v: number) => void
}

function Controls({
  dateRange,
  setDateRange,
  collectionId,
  setCollectionId,
  collections,
  digestTitle,
  setDigestTitle,
  limit,
  setLimit,
}: ControlsProps) {
  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-3 pr- py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
  const labelCls = "block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div>
        <label className={labelCls}>Date Range</label>
        <select className={inputCls} value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)}>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Source</label>
        <select className={inputCls} value={collectionId} onChange={e => setCollectionId(e.target.value)}>
          <option value="all">All Feeds</option>
          {collections?.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Max Articles</label>
        <select className={inputCls} value={limit} onChange={e => setLimit(Number(e.target.value))}>
          <option value={5}>5 articles</option>
          <option value={10}>10 articles</option>
          <option value={20}>20 articles</option>
          <option value={50}>50 articles</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Digest Title</label>
        <input className={inputCls} value={digestTitle} onChange={e => setDigestTitle(e.target.value)} placeholder="Weekly Digest" />
      </div>
    </div>
  )
}

interface ArticleListProps {
  articles: ArticleWithFeed[] | undefined
  isLoading: boolean
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
}

function ArticleList({ articles, isLoading, selectedIds, onToggle, onSelectAll }: ArticleListProps) {
  const allSelected = (articles?.length ?? 0) > 0 && selectedIds.size === articles?.length
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col max-h-[600px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
          Articles <span className="text-gray-400 font-normal">({articles?.length ?? 0})</span>
        </h2>
        <button onClick={onSelectAll} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading…</div>
        ) : !articles?.length ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No articles in this range.</div>
        ) : (
          articles.map(article => (
            <label key={article.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <input
                type="checkbox"
                checked={selectedIds.has(article.id)}
                onChange={() => onToggle(article.id)}
                className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug">{article.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {article.feed.title} · {dateFormat(new Date(article.published_at), "MMM d")}
                </p>
              </div>
            </label>
          ))
        )}
      </div>
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {selectedIds.size} of {articles?.length ?? 0} selected
      </div>
    </div>
  )
}

interface PreviewProps {
  output: string
  exportFormat: ExportFormat
  setExportFormat: (f: ExportFormat) => void
  selectedCount: number
  onCopy: () => void
  onSendToBeehiiv?: () => void
  isSendingToBeehiiv?: boolean
  hasBeehiiv?: boolean
  onSendToMailerLite?: () => void
  isSendingToMailerLite?: boolean
  hasMailerLite?: boolean
}

function Preview({
  output,
  exportFormat,
  setExportFormat,
  selectedCount,
  onCopy,
  onSendToBeehiiv,
  isSendingToBeehiiv,
  hasBeehiiv,
  onSendToMailerLite,
  isSendingToMailerLite,
  hasMailerLite,
}: PreviewProps) {
  const tabs: { id: ExportFormat; label: string; hint: string }[] = [
    { id: "markdown", label: "Markdown", hint: "Ghost, Notion, Obsidian" },
    { id: "html", label: "HTML", hint: "Beehiiv, Substack, ConvertKit" },
    { id: "text", label: "Plain Text", hint: "Any platform" },
  ]
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col max-h-[600px]">
      <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setExportFormat(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              exportFormat === tab.id ? "bg-primary-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            title={tab.hint}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">{tabs.find(t => t.id === exportFormat)?.hint}</span>
      </div>
      <textarea
        readOnly
        value={output || (selectedCount === 0 ? "Select at least one article to generate a preview." : "")}
        className="flex-1 font-mono text-xs p-4 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 resize-none focus:outline-none overflow-y-auto"
        placeholder="Your formatted digest will appear here…"
      />
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedCount} article{selectedCount !== 1 ? "s" : ""} included
        </span>
        <div className="flex items-center gap-2">
          {hasBeehiiv && onSendToBeehiiv && (
            <button
              onClick={onSendToBeehiiv}
              disabled={!output || isSendingToBeehiiv}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>🐝</span>
              {isSendingToBeehiiv ? "Sending…" : "Send to Beehiiv"}
            </button>
          )}
          {hasMailerLite && onSendToMailerLite && (
            <button
              onClick={onSendToMailerLite}
              disabled={!output || isSendingToMailerLite}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>💚</span>
              {isSendingToMailerLite ? "Sending…" : "Send to MailerLite"}
            </button>
          )}
          <button
            onClick={onCopy}
            disabled={!output}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Schedule Tab ─────────────────────────────────────────────────────────────

const SCHEDULE_LABELS: Record<string, string> = {
  hourly: "Every hour",
  every_6h: "Every 6 hours",
  every_12h: "Every 12 hours",
  daily: "Daily (9 AM UTC)",
  weekly_monday: "Weekly — Monday",
  weekly_wednesday: "Weekly — Wednesday",
  weekly_friday: "Weekly — Friday",
}

function ScheduleTab({ collections }: { collections: Array<{ id: string; name: string }> | undefined }) {
  const qc = useQueryClient()
  const { hasFeature } = useSubscription()
  const canSchedule = hasFeature("scheduledDigest")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: "",
    schedule: "weekly_monday",
    collection_id: "",
    platform: "beehiiv",
    max_articles: 10,
    digest_title_template: "{name} – {date}",
  })

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["scheduled-digests"],
    queryFn: async () => {
      if (isDemoMode) return []
      const { data, error } = await supabase.from("scheduled_digests").select("*").order("created_at", { ascending: false })
      if (error) throw error
      return data as ScheduledDigest[]
    },
    enabled: !isDemoMode && canSchedule,
  })

  const { data: beehiivConnected } = useQuery({
    queryKey: ["integration-beehiiv"],
    queryFn: async () => {
      if (isDemoMode) return false
      const { data } = await supabase.from("user_integrations").select("id").eq("provider", "beehiiv").maybeSingle()
      return !!data
    },
    enabled: !isDemoMode && canSchedule,
  })

  const { data: mailerLiteConnected } = useQuery({
    queryKey: ["integration-mailerlite"],
    queryFn: async () => {
      if (isDemoMode) return false
      const { data } = await supabase.from("user_integrations").select("id").eq("provider", "mailerlite").maybeSingle()
      return !!data
    },
    enabled: !isDemoMode && canSchedule,
  })

  const neitherConnected = beehiivConnected === false && mailerLiteConnected === false

  const createMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const now = new Date()
      const hourIntervals: Record<string, number> = { hourly: 1, every_6h: 6, every_12h: 12 }
      const dayMap: Record<string, number> = { weekly_monday: 1, weekly_wednesday: 3, weekly_friday: 5 }
      let next: Date
      if (hourIntervals[form.schedule]) {
        next = new Date(now.getTime() + hourIntervals[form.schedule] * 3600_000)
        next.setUTCMinutes(0, 0, 0)
      } else {
        next = new Date(now)
        next.setUTCHours(9, 0, 0, 0)
        if (form.schedule === "daily") {
          if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
        } else {
          const target = dayMap[form.schedule]
          const cur = next.getUTCDay()
          let diff = (target - cur + 7) % 7
          if (diff === 0) diff = 7
          next.setUTCDate(next.getUTCDate() + diff)
        }
      }
      const { error } = await supabase.from("scheduled_digests").insert({
        user_id: user.id,
        name: form.name,
        schedule: form.schedule as ScheduledDigest["schedule"],
        collection_id: form.collection_id || null,
        platform: form.platform as ScheduledDigest["platform"],
        max_articles: form.max_articles,
        digest_title_template: form.digest_title_template,
        next_run_at: next.toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Schedule created!")
      qc.invalidateQueries({ queryKey: ["scheduled-digests"] })
      setShowForm(false)
      setForm({
        name: "",
        schedule: "weekly_monday",
        collection_id: "",
        platform: "beehiiv",
        max_articles: 10,
        digest_title_template: "{name} – {date}",
      })
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create schedule"),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("scheduled_digests").update({ is_active }).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-digests"] }),
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_digests").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Schedule deleted")
      qc.invalidateQueries({ queryKey: ["scheduled-digests"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (!canSchedule) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">⏰</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scheduled Auto-Draft</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Automatically create newsletter drafts on a schedule. Available on Creator+ plans.</p>
        <Link
          to="/pricing"
          className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Upgrade to Creator →
        </Link>
      </div>
    )
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
  const labelCls = "block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduled Auto-Drafts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Auto-create newsletter drafts in Beehiiv or MailerLite on a recurring schedule.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Schedule
        </button>
      </div>

      {/* Integration status banner */}
      <div
        className={`rounded-lg border p-4 ${neitherConnected ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"}`}
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Newsletter Platform Connections</p>
            <div className="flex flex-wrap gap-3">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${beehiivConnected ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
              >
                {beehiivConnected ? "✅" : "⬜"} 🐝 Beehiiv {beehiivConnected ? "Connected" : "Not connected"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${mailerLiteConnected ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
              >
                {mailerLiteConnected ? "✅" : "⬜"} 💚 MailerLite {mailerLiteConnected ? "Connected" : "Not connected"}
              </span>
            </div>
            {neitherConnected && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                You need to connect at least one platform before schedules can send drafts.
              </p>
            )}
          </div>
          <Link
            to="/settings"
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-colors"
          >
            Manage in Settings →
          </Link>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">New Schedule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Name</label>
              <input
                className={inputCls}
                placeholder="My Weekly Digest"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Frequency</label>
              <select className={inputCls} value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}>
                {Object.entries(SCHEDULE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <select className={inputCls} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                <option value="beehiiv">🐝 Beehiiv</option>
                <option value="mailerlite">💚 MailerLite</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Source Collection</label>
              <select className={inputCls} value={form.collection_id} onChange={e => setForm(f => ({ ...f, collection_id: e.target.value }))}>
                <option value="">All Feeds</option>
                {collections?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Max Articles</label>
              <select className={inputCls} value={form.max_articles} onChange={e => setForm(f => ({ ...f, max_articles: Number(e.target.value) }))}>
                {[5, 10, 15, 20].map(n => (
                  <option key={n} value={n}>
                    {n} articles
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Title Template</label>
              <input
                className={inputCls}
                value={form.digest_title_template}
                onChange={e => setForm(f => ({ ...f, digest_title_template: e.target.value }))}
              />
              <p className="text-xs text-gray-400 mt-1">
                Use {"{name}"} and {"{date}"} as placeholders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || createMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-40 transition-colors"
            >
              {createMutation.isPending ? "Creating…" : "Create Schedule"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading schedules…</div>
      ) : !schedules?.length ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-3xl mb-2">⏰</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No schedules yet. Click "New Schedule" to automate your digests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">{s.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}
                  >
                    {s.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {SCHEDULE_LABELS[s.schedule] ?? s.schedule} · {s.platform === "beehiiv" ? "🐝 Beehiiv" : "💚 MailerLite"} · {s.max_articles}{" "}
                  articles
                </p>
                {s.next_run_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Next: {dateFormat(new Date(s.next_run_at), "MMM d, yyyy 'at' h:mm a")} UTC
                  </p>
                )}
                {s.last_run_at && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Last run: {dateFormat(new Date(s.last_run_at), "MMM d, yyyy")}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: s.id, is_active: !s.is_active })}
                  className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {s.is_active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete schedule "${s.name}"?`)) deleteMutation.mutate(s.id)
                  }}
                  className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-900 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Save-to-history helper ───────────────────────────────────────────────────

async function saveDigestToHistory(opts: {
  title: string
  contentHtml: string
  contentMarkdown: string
  articleIds: string[]
  collectionId: string
  destination: "clipboard" | "beehiiv" | "mailerlite"
}) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("digest_history").insert({
      user_id: user.id,
      title: opts.title,
      content_html: opts.contentHtml,
      content_markdown: opts.contentMarkdown,
      article_count: opts.articleIds.length,
      article_ids: opts.articleIds,
      source: opts.collectionId && opts.collectionId !== "all" ? "collection" : "all_feeds",
      collection_id: opts.collectionId && opts.collectionId !== "all" ? opts.collectionId : null,
      destination: opts.destination,
    })
  } catch (err) {
    console.error("[DigestPage] Failed to save digest history:", err)
  }
}

// ── History Tab ─────────────────────────────────────────────────────────────

function HistoryTab() {
  const qc = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: history, isLoading } = useQuery({
    queryKey: ["digest-history"],
    queryFn: async () => {
      if (isDemoMode) return []
      const { data, error } = await supabase.from("digest_history").select("*").order("created_at", { ascending: false }).limit(50)
      if (error) throw error
      return data as DigestHistory[]
    },
    enabled: !isDemoMode,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("digest_history").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Digest deleted from history")
      qc.invalidateQueries({ queryKey: ["digest-history"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const destinationLabel: Record<string, string> = {
    clipboard: "Clipboard",
    beehiiv: "Beehiiv",
    mailerlite: "MailerLite",
  }
  const destinationColor: Record<string, string> = {
    clipboard: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    beehiiv: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    mailerlite: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  }

  const handleCopyContent = async (entry: DigestHistory) => {
    const content = entry.content_markdown || entry.content_html || ""
    try {
      await navigator.clipboard.writeText(content)
      toast.success("Copied to clipboard!")
    } catch {
      toast.error("Failed to copy")
    }
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Loading history...</div>
  }

  if (!history?.length) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-3xl mb-2">📜</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Digest History</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Digests you send or export will appear here for future reference.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Digest History</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{history.length} past digest{history.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {history.map(entry => (
        <div key={entry.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div
            className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{entry.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${destinationColor[entry.destination] || destinationColor.clipboard}`}>
                  {destinationLabel[entry.destination] || entry.destination}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {entry.article_count} article{entry.article_count !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {dateFormat(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                {entry.source === "collection" && " · from collection"}
              </p>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expandedId === entry.id ? "" : "-rotate-90"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {expandedId === entry.id && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <textarea
                readOnly
                value={entry.content_markdown || entry.content_html || "(no content saved)"}
                className="w-full h-48 font-mono text-xs p-3 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md resize-none focus:outline-none"
              />
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => handleCopyContent(entry)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-md text-xs font-medium hover:bg-primary-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Re-copy
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this digest from history?")) deleteMutation.mutate(entry.id)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-md text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function DigestPage() {
  const [activeTab, setActiveTab] = useState<PageTab>("builder")
  const [dateRange, setDateRange] = useState<DateRange>("7d")
  const [collectionId, setCollectionId] = useState("all")
  const [limit, setLimit] = useState(10)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exportFormat, setExportFormat] = useState<ExportFormat>("markdown")
  const [digestTitle, setDigestTitle] = useState("Weekly Digest")
  const { hasFeature } = useSubscription()
  const canExport = hasFeature("newsletterExport")

  const cutoff = useMemo(() => {
    const now = new Date()
    if (dateRange === "24h") return subHours(now, 24).toISOString()
    if (dateRange === "7d") return subDays(now, 7).toISOString()
    return subDays(now, 30).toISOString()
  }, [dateRange])

  const { data: collections } = useQuery({
    queryKey: ["digest-collections"],
    queryFn: async () => {
      if (isDemoMode) return []
      const { data, error } = await supabase.from("feed_collections").select("id, name, sources:feed_collection_sources(feed_id)").order("name")
      if (error) throw error
      return data as Array<{ id: string; name: string; sources: Array<{ feed_id: string }> }>
    },
  })

  const { data: articles, isLoading } = useQuery({
    queryKey: ["digest-articles", dateRange, collectionId, cutoff, limit],
    queryFn: async () => {
      if (isDemoMode) return []
      let query = supabase
        .from("articles")
        .select("*, feed:feeds(title, url)")
        .gte("published_at", cutoff)
        .order("published_at", { ascending: false })
        .limit(limit)

      if (collectionId !== "all" && collections) {
        const col = collections.find(c => c.id === collectionId)
        if (col && col.sources.length > 0) {
          query = query.in(
            "feed_id",
            col.sources.map(s => s.feed_id),
          )
        }
      }

      const { data, error } = await query
      if (error) throw error
      const items = (data || []) as ArticleWithFeed[]
      setSelectedIds(new Set(items.map(a => a.id)))
      return items
    },
    enabled: !isDemoMode,
  })

  const selectedArticles = useMemo(() => (articles || []).filter(a => selectedIds.has(a.id)), [articles, selectedIds])

  const output = useMemo(() => {
    if (!selectedArticles.length) return ""
    if (exportFormat === "markdown") return generateMarkdown(digestTitle, selectedArticles)
    if (exportFormat === "html") return generateHTML(digestTitle, selectedArticles)
    return generateText(digestTitle, selectedArticles)
  }, [selectedArticles, exportFormat, digestTitle])

  const toggleArticle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = () => {
    if (selectedIds.size === (articles?.length ?? 0)) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set((articles || []).map(a => a.id)))
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      toast.success("Copied to clipboard!")
      await saveDigestToHistory({
        title: digestTitle,
        contentHtml: generateHTML(digestTitle, selectedArticles),
        contentMarkdown: generateMarkdown(digestTitle, selectedArticles),
        articleIds: selectedArticles.map(a => a.id),
        collectionId: collectionId,
        destination: "clipboard",
      })
    } catch {
      toast.error("Failed to copy — try selecting the text manually.")
    }
  }

  // Check if user has Beehiiv connected
  const { data: beehiivIntegration } = useQuery({
    queryKey: ["integration-beehiiv"],
    queryFn: async () => {
      if (isDemoMode) return null
      const { data } = await supabase.from("user_integrations").select("publication_id").eq("provider", "beehiiv").maybeSingle()
      return data as { publication_id: string } | null
    },
    enabled: !isDemoMode && canExport,
  })

  const sendToBeehiivMutation = useMutation({
    mutationFn: async () => {
      const htmlContent = exportFormat === "html" ? output : generateHTML(digestTitle, selectedArticles)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-to-beehiiv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: digestTitle, content_html: htmlContent }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "Failed to send")
      return result as { success: boolean; postId?: string; webUrl?: string }
    },
    onSuccess: data => {
      if (data.webUrl) {
        toast.success(
          <span>
            Draft created in Beehiiv!{" "}
            <a href={data.webUrl} target="_blank" rel="noopener noreferrer" className="underline">
              View draft →
            </a>
          </span>,
          { duration: 6000 },
        )
      } else {
        toast.success("Draft created in Beehiiv!")
      }
      saveDigestToHistory({
        title: digestTitle,
        contentHtml: generateHTML(digestTitle, selectedArticles),
        contentMarkdown: generateMarkdown(digestTitle, selectedArticles),
        articleIds: selectedArticles.map(a => a.id),
        collectionId: collectionId,
        destination: "beehiiv",
      })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send to Beehiiv")
    },
  })

  // Check if user has MailerLite connected
  const { data: mailerLiteIntegration } = useQuery({
    queryKey: ["integration-mailerlite"],
    queryFn: async () => {
      if (isDemoMode) return null
      const { data } = await supabase.from("user_integrations").select("api_key").eq("provider", "mailerlite").maybeSingle()
      return data as { api_key: string } | null
    },
    enabled: !isDemoMode && canExport,
  })

  const sendToMailerLiteMutation = useMutation({
    mutationFn: async () => {
      const htmlContent = exportFormat === "html" ? output : generateHTML(digestTitle, selectedArticles)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-to-mailerlite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: digestTitle, content_html: htmlContent }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || "Failed to send")
      return result as { success: boolean; campaignId?: string; editUrl?: string; contentNotAdded?: boolean }
    },
    onSuccess: data => {
      if (data.contentNotAdded && data.editUrl) {
        toast.success(
          <span>
            Draft created in MailerLite!{" "}
            <a href={data.editUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Edit campaign →
            </a>
            <br />
            <span className="text-xs opacity-80">Content requires MailerLite Advanced plan — paste HTML in editor.</span>
          </span>,
          { duration: 8000 },
        )
      } else if (data.editUrl) {
        toast.success(
          <span>
            Draft created in MailerLite!{" "}
            <a href={data.editUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Edit campaign →
            </a>
          </span>,
          { duration: 6000 },
        )
      } else {
        toast.success("Draft created in MailerLite!")
      }
      saveDigestToHistory({
        title: digestTitle,
        contentHtml: generateHTML(digestTitle, selectedArticles),
        contentMarkdown: generateMarkdown(digestTitle, selectedArticles),
        articleIds: selectedArticles.map(a => a.id),
        collectionId: collectionId,
        destination: "mailerlite",
      })
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send to MailerLite")
    },
  })

  if (!canExport) {
    return <UpgradePrompt />
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Newsletter Digest</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Curate your top articles and export a formatted digest, or set up automated scheduled drafts.
        </p>
      </div>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(
          [
            ["builder", "📄 Digest Builder"],
            ["schedules", "⏰ Schedules"],
            ["history", "📜 History"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "history" ? (
        <HistoryTab />
      ) : activeTab === "schedules" ? (
        <ScheduleTab collections={collections} />
      ) : (
        <>
          <Controls
            dateRange={dateRange}
            setDateRange={setDateRange}
            collectionId={collectionId}
            setCollectionId={setCollectionId}
            collections={collections}
            limit={limit}
            setLimit={setLimit}
            digestTitle={digestTitle}
            setDigestTitle={setDigestTitle}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <ArticleList articles={articles} isLoading={isLoading} selectedIds={selectedIds} onToggle={toggleArticle} onSelectAll={handleSelectAll} />
            <Preview
              output={output}
              exportFormat={exportFormat}
              setExportFormat={setExportFormat}
              selectedCount={selectedArticles.length}
              onCopy={handleCopy}
              hasBeehiiv={!!beehiivIntegration}
              onSendToBeehiiv={() => sendToBeehiivMutation.mutate()}
              isSendingToBeehiiv={sendToBeehiivMutation.isPending}
              hasMailerLite={!!mailerLiteIntegration}
              onSendToMailerLite={() => sendToMailerLiteMutation.mutate()}
              isSendingToMailerLite={sendToMailerLiteMutation.isPending}
            />
          </div>
        </>
      )}
    </div>
  )
}
