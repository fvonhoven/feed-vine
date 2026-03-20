import { formatDistanceToNow } from "date-fns"
import { useState } from "react"
import type { ArticleWithStatus } from "../types/database"
import { useSubscription } from "../hooks/useSubscription"
import { supabase } from "../lib/supabase"
import { isSafeUrl } from "../lib/urlUtils"
import toast from "react-hot-toast"

interface ArticleCardProps {
  article: ArticleWithStatus
  onToggleRead?: (articleId: string, isRead: boolean) => void
  onToggleSave?: (articleId: string, isSaved: boolean) => void
}

// Strip HTML tags from text and decode HTML entities
function stripHtml(html: string | null | undefined): string {
  if (!html) return ""

  // First, decode HTML entities (handles &lt;p&gt; -> <p>)
  const doc = new DOMParser().parseFromString(html, "text/html")
  let text = doc.body.textContent || ""

  // If the result still contains HTML tags (double-encoded), strip them with regex
  // This handles cases where entities were decoded to actual tags
  text = text.replace(/<[^>]*>/g, " ")

  // Clean up multiple spaces and trim
  text = text.replace(/\s+/g, " ").trim()

  return text
}

function readingTime(content: string | null | undefined, description: string | null | undefined): number {
  const text = stripHtml(content || description)
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export default function ArticleCard({ article, onToggleRead, onToggleSave }: ArticleCardProps) {
  const isRead = article.user_article?.is_read || false
  const isSaved = article.user_article?.is_saved || false
  const { hasFeature } = useSubscription()
  const canSaveArticles = hasFeature("savedArticles")
  const canSummarize = hasFeature("aiSummaries")

  const [aiSummary, setAiSummary] = useState<string | null>(article.ai_summary ?? null)
  const [summarizing, setSummarizing] = useState(false)
  const [showSummary, setShowSummary] = useState(!!article.ai_summary)

  const handleArticleClick = () => {
    if (!isRead && onToggleRead) {
      onToggleRead(article.id, true)
    }
  }

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!canSaveArticles) {
      toast.error("Upgrade to Starter to save articles!")
      return
    }

    if (onToggleSave) {
      onToggleSave(article.id, !isSaved)
    }
  }

  const handleToggleRead = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onToggleRead) {
      onToggleRead(article.id, !isRead)
    }
  }

  const handleSummarize = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!canSummarize) {
      toast.error("AI summaries require Creator plan or higher")
      return
    }

    // Toggle off if summary already shown
    if (aiSummary) {
      setShowSummary(prev => !prev)
      return
    }

    setSummarizing(true)
    try {
      const { data, error } = await supabase.functions.invoke("summarize-article", {
        body: { articleId: article.id },
      })
      if (error) {
        // Try to extract the actual error message from the function response body
        let message = error.message
        try {
          const body = await (error as any).context?.json?.()
          if (body?.error) message = body.error
        } catch {
          // ignore parse error, use default message
        }
        throw new Error(message)
      }
      setAiSummary(data.summary)
      setShowSummary(true)
    } catch (err: any) {
      toast.error(err.message || "Failed to summarize article")
    } finally {
      setSummarizing(false)
    }
  }

  return (
    <article
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-200 dark:border-gray-700 ${
        isRead ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a
            href={isSafeUrl(article.url) ? article.url : "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleArticleClick}
            className="block group"
          >
            <h2
              className={`text-lg font-semibold mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${
                isRead ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {article.title}
            </h2>
            {(article.content || article.description) && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3">
                {stripHtml(article.content && article.content.length > 200 ? article.content : article.description)}
              </p>
            )}
          </a>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span className="font-medium text-primary-600 dark:text-primary-400">{article.feed.title}</span>
            <span>•</span>
            <time dateTime={article.published_at}>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</time>
            <span>•</span>
            <span>{readingTime(article.content, article.description)} min read</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Summarize button */}
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className={`p-2 rounded-md transition-colors ${
              showSummary && aiSummary
                ? "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
                : canSummarize
                  ? "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  : "text-gray-300 dark:text-gray-600 opacity-50"
            } ${summarizing ? "cursor-wait" : ""}`}
            title={
              !canSummarize
                ? "AI summaries require Creator plan or higher"
                : showSummary && aiSummary
                  ? "Hide AI summary"
                  : aiSummary
                    ? "Show AI summary"
                    : "Summarize with AI"
            }
          >
            {summarizing ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={handleToggleRead}
            className={`p-2 rounded-md transition-colors ${
              isRead
                ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            title={isRead ? "Mark as unread" : "Mark as read"}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isRead ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </button>

          <button
            onClick={handleToggleSave}
            disabled={!canSaveArticles && !isSaved}
            className={`p-2 rounded-md transition-colors ${
              isSaved
                ? "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
                : canSaveArticles
                  ? "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  : "text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"
            }`}
            title={!canSaveArticles && !isSaved ? "Upgrade to Starter to save articles" : isSaved ? "Remove from saved" : "Save for later"}
          >
            <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* AI Summary panel */}
      {showSummary && aiSummary && (
        <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-900/30">
          <div className="flex items-start gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">{aiSummary}</p>
          </div>
        </div>
      )}
    </article>
  )
}
