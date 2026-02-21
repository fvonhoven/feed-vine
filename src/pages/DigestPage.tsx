import { useState, useMemo, useCallback } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { format as dateFormat, subDays, subHours } from "date-fns"
import { supabase, isDemoMode } from "../lib/supabase"
import type { ArticleWithFeed } from "../types/database"
import { useSubscription } from "../hooks/useSubscription"
import toast from "react-hot-toast"
import { Link } from "react-router-dom"

type DateRange = "24h" | "7d" | "30d"
type ExportFormat = "markdown" | "html" | "text"

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

function generateMarkdown(title: string, articles: ArticleWithFeed[]): string {
  const date = dateFormat(new Date(), "MMMM d, yyyy")
  let md = `# ${title}\n\n*${date}*\n\n---\n\n`
  articles.forEach(a => {
    md += `## [${a.title}](${a.url})\n\n`
    if (a.description) md += `${stripHtml(a.description)}\n\n`
    md += `*${a.feed.title} · ${dateFormat(new Date(a.published_at), "MMM d")}*\n\n---\n\n`
  })
  return md
}

function generateHTML(title: string, articles: ArticleWithFeed[]): string {
  const date = dateFormat(new Date(), "MMMM d, yyyy")
  let html = `<h1 style="font-family:sans-serif;color:#111;">${title}</h1>\n`
  html += `<p style="color:#888;font-size:14px;">${date}</p>\n<hr>\n`
  articles.forEach(a => {
    html += `<h2 style="font-family:sans-serif;"><a href="${a.url}" style="color:#0070f3;text-decoration:none;">${a.title}</a></h2>\n`
    if (a.description) html += `<p style="color:#444;line-height:1.6;">${stripHtml(a.description)}</p>\n`
    html += `<p style="color:#888;font-size:12px;">${a.feed.title} · ${dateFormat(new Date(a.published_at), "MMM d")}</p>\n<hr>\n`
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
          Compile your top articles into a formatted digest you can paste straight into Beehiiv, Substack, ConvertKit, or Ghost. Available on Pro and
          above.
        </p>
        <Link
          to="/pricing"
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Upgrade to Pro →
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

// ── Main Component ───────────────────────────────────────────────────────────

export default function DigestPage() {
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
    },
    onError: (err: any) => {
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
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send to MailerLite")
    },
  })

  if (!canExport) {
    return <UpgradePrompt />
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Newsletter Digest Builder</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Curate your top articles and export a formatted digest for Beehiiv, Substack, ConvertKit, or Ghost.
        </p>
      </div>
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
    </div>
  )
}
