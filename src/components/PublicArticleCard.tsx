import { formatDistanceToNow } from "date-fns"
import { isSafeUrl } from "../lib/urlUtils"

export interface PublicArticleCardItem {
  id: string
  title: string
  url: string
  description: string | null
  content: string | null
  published_at: string
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return ""
  const doc = new DOMParser().parseFromString(html, "text/html")
  let text = doc.body.textContent || ""
  text = text.replace(/<[^>]*>/g, " ")
  return text.replace(/\s+/g, " ").trim()
}

function readingTime(content: string | null | undefined, description: string | null | undefined): number {
  const text = stripHtml(content || description)
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

export default function PublicArticleCard({ article }: { article: PublicArticleCardItem }) {
  const excerptSource = article.content && article.content.length > 200 ? article.content : article.description

  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col gap-2">
        <a href={isSafeUrl(article.url) ? article.url : "#"} target="_blank" rel="noopener noreferrer" className="group block">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {article.title}
          </h2>
          {excerptSource && <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-3">{stripHtml(excerptSource)}</p>}
        </a>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-500">
          <time dateTime={article.published_at}>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</time>
          <span>•</span>
          <span>{readingTime(article.content, article.description)} min read</span>
        </div>
      </div>
    </article>
  )
}
