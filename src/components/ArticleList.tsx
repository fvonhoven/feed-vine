import type { ArticleWithFeed } from '../types/database'
import ArticleCard from './ArticleCard'

interface ArticleListProps {
  articles: ArticleWithFeed[]
  isLoading: boolean
}

export default function ArticleList({ articles, isLoading }: ArticleListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No articles found. Try adjusting your filters or add some RSS feeds.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )
}

