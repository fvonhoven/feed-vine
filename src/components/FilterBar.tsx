import { useQuery } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { Feed } from "../types/database"

interface FilterBarProps {
  keyword: string
  onKeywordChange: (keyword: string) => void
  selectedFeedId: string
  onFeedChange: (feedId: string) => void
  dateRange: string
  onDateRangeChange: (range: string) => void
}

export default function FilterBar({ keyword, onKeywordChange, selectedFeedId, onFeedChange, dateRange, onDateRangeChange }: FilterBarProps) {
  const { data: feeds } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      // In demo mode, return empty array
      if (isDemoMode) {
        return []
      }

      const { data, error } = await supabase.from("feeds").select("*").order("title")

      if (error) throw error
      return data as Feed[]
    },
  })

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Keyword Search */}
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={e => onKeywordChange(e.target.value)}
            placeholder="Search articles..."
            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        {/* Source Filter */}
        <div>
          <label htmlFor="feed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Source
          </label>
          <select
            id="feed"
            value={selectedFeedId}
            onChange={e => onFeedChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">All sources</option>
            {feeds?.map(feed => (
              <option key={feed.id} value={feed.id}>
                {feed.title}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date Range
          </label>
          <select
            id="dateRange"
            value={dateRange}
            onChange={e => onDateRangeChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="all">All time</option>
            <option value="24h">Last 24 hours</option>
            <option value="week">Last week</option>
            <option value="month">Last month</option>
          </select>
        </div>
      </div>
    </div>
  )
}
