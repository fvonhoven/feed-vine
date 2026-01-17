import { formatDistanceToNow } from "date-fns"
import type { ArticleWithStatus } from "../types/database"
import { useSubscription } from "../hooks/useSubscription"
import toast from "react-hot-toast"

interface ArticleCardProps {
  article: ArticleWithStatus
  onToggleRead?: (articleId: string, isRead: boolean) => void
  onToggleSave?: (articleId: string, isSaved: boolean) => void
}

export default function ArticleCard({ article, onToggleRead, onToggleSave }: ArticleCardProps) {
  const isRead = article.user_article?.is_read || false
  const isSaved = article.user_article?.is_saved || false
  const { hasFeature } = useSubscription()
  const canSaveArticles = hasFeature("savedArticles")

  const handleArticleClick = () => {
    if (!isRead && onToggleRead) {
      onToggleRead(article.id, true)
    }
  }

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!canSaveArticles) {
      toast.error("Upgrade to Pro to save articles!")
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

  return (
    <article
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-200 dark:border-gray-700 ${
        isRead ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={handleArticleClick} className="block group">
            <h2
              className={`text-lg font-semibold mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${
                isRead ? "text-gray-600 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {article.title}
            </h2>
            {article.description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{article.description}</p>}
          </a>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span className="font-medium text-primary-600 dark:text-primary-400">{article.feed.title}</span>
            <span>•</span>
            <time dateTime={article.published_at}>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</time>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            title={!canSaveArticles && !isSaved ? "Upgrade to Pro to save articles" : isSaved ? "Remove from saved" : "Save for later"}
          >
            <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}
