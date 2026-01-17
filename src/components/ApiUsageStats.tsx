import { useQuery } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import { useState } from "react"

interface ApiUsageData {
  period: string
  totalRequests: number
  currentHourRequests: number
  rateLimit: number
  rateLimitRemaining: number
  apiKeys: Array<{
    id: string
    name: string
    key_prefix: string
    last_used_at: string | null
  }>
  endpointStats: Array<{
    endpoint: string
    count: number
  }>
  dailyUsage: Array<{
    date: string
    count: number
  }>
}

export default function ApiUsageStats() {
  const [period, setPeriod] = useState("7d")

  const { data: usageData, isLoading } = useQuery({
    queryKey: ["api-usage-stats", period],
    queryFn: async () => {
      if (isDemoMode) {
        // Return demo data
        return {
          period,
          totalRequests: 1247,
          currentHourRequests: 23,
          rateLimit: 2000,
          rateLimitRemaining: 1977,
          apiKeys: [],
          endpointStats: [
            { endpoint: "/api/v1/articles", count: 542 },
            { endpoint: "/api/v1/feeds", count: 385 },
            { endpoint: "/api/v1/categories", count: 210 },
            { endpoint: "/api/v1/collections", count: 110 },
          ],
          dailyUsage: [
            { date: "2024-01-09", count: 145 },
            { date: "2024-01-10", count: 178 },
            { date: "2024-01-11", count: 203 },
            { date: "2024-01-12", count: 189 },
            { date: "2024-01-13", count: 167 },
            { date: "2024-01-14", count: 198 },
            { date: "2024-01-15", count: 167 },
          ],
        } as ApiUsageData
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-usage-stats?period=${period}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch API usage stats")
      }

      const result = await response.json()
      return result.data as ApiUsageData
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!usageData) return null

  const usagePercentage = (usageData.currentHourRequests / usageData.rateLimit) * 100
  const maxDailyCount = Math.max(...usageData.dailyUsage.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API Usage</h2>
        <div className="flex gap-2">
          {["24h", "7d", "30d", "90d"].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === p
                  ? "bg-primary-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Requests</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{usageData.totalRequests.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last {period}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Hour</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{usageData.currentHourRequests.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{usageData.rateLimitRemaining.toLocaleString()} remaining</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rate Limit</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{usageData.rateLimit.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">requests/hour</div>
        </div>
      </div>

      {/* Rate Limit Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Hour Usage</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{usagePercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              usagePercentage > 90 ? "bg-red-600" : usagePercentage > 70 ? "bg-yellow-600" : "bg-green-600"
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Daily Usage Chart */}
      {usageData.dailyUsage.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Requests</h3>
          <div className="flex items-end justify-between gap-2 h-48">
            {usageData.dailyUsage.map(day => {
              const height = (day.count / maxDailyCount) * 100
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: "160px" }}>
                    <div
                      className="w-full bg-primary-600 dark:bg-primary-500 rounded-t hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors cursor-pointer group relative"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${day.count} requests`}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.count} requests
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 transform -rotate-45 origin-top-left whitespace-nowrap">
                    {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Endpoint Stats */}
      {usageData.endpointStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requests by Endpoint</h3>
          <div className="space-y-3">
            {usageData.endpointStats.map(stat => {
              const percentage = (stat.count / usageData.totalRequests) * 100
              return (
                <div key={stat.endpoint}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{stat.endpoint}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.count.toLocaleString()} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
