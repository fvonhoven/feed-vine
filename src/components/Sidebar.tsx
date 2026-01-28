import { Link, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { Category, Feed } from "../types/database"

export default function Sidebar() {
  const location = useLocation()

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      if (isDemoMode) {
        return []
      }
      const { data, error } = await supabase.from("categories").select("*").order("name")
      if (error) throw error
      return data as Category[]
    },
  })

  const { data: feeds } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      if (isDemoMode) {
        return []
      }
      const { data, error } = await supabase.from("feeds").select("*").order("title")
      if (error) throw error
      return data as Feed[]
    },
  })

  const isActive = (path: string) => location.pathname === path

  // Group feeds by category
  const feedsByCategory = feeds?.reduce(
    (acc, feed) => {
      const catId = feed.category_id || "uncategorized"
      if (!acc[catId]) acc[catId] = []
      acc[catId].push(feed)
      return acc
    },
    {} as Record<string, Feed[]>,
  )

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Views</h2>
        <nav className="space-y-1">
          <Link
            to="/"
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
              isActive("/")
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              All Articles
            </span>
            {isDemoMode && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">5</span>}
          </Link>

          <Link
            to="/saved"
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
              isActive("/saved")
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved
            </span>
            {isDemoMode && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">2</span>}
          </Link>

          <Link
            to="/collections"
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
              isActive("/collections")
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Collections
            </span>
          </Link>

          <Link
            to="/api-keys"
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
              isActive("/api-keys")
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              API Keys
            </span>
          </Link>
        </nav>

        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-3">Categories</h2>
        <nav className="space-y-2">
          {categories?.map(category => (
            <div key={category.id}>
              <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: category.color }}></span>
                  {category.name}
                </span>
                {isDemoMode && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{feedsByCategory?.[category.id]?.length || 0}</span>
                )}
              </div>
              {feedsByCategory?.[category.id]?.map(feed => (
                <Link
                  key={feed.id}
                  to={`/feed/${feed.id}`}
                  className="flex items-center justify-between pl-9 pr-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <span className="truncate">{feed.title}</span>
                </Link>
              ))}
            </div>
          ))}

          {feedsByCategory?.["uncategorized"] && (
            <div>
              <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                <span>Uncategorized</span>
              </div>
              {feedsByCategory["uncategorized"].map(feed => (
                <Link
                  key={feed.id}
                  to={`/feed/${feed.id}`}
                  className="flex items-center justify-between pl-9 pr-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <span className="truncate">{feed.title}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}
