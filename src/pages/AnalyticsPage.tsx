import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { format, parseISO, subDays } from "date-fns"

import { supabase } from "../lib/supabase"
import { useAuth } from "../hooks/useAuth"

interface TotalStats {
  total_read: number
  total_saved: number
  read_today: number
  read_this_week: number
  read_this_month: number
  streak_days: number
}

interface ReadDay {
  day: string
  count: number
}

interface TopFeed {
  feed_id: string
  feed_title: string
  read_count: number
}

interface FeedHealthRow {
  feed_id: string
  feed_title: string
  feed_url: string
  status: string
  error_message: string | null
  last_fetched: string | null
  article_count: number
  latest_article: string | null
  articles_per_week: number
}

function useAnalytics() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ["analytics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analytics-stats")
      if (error) throw error
      return data as {
        readsPerDay: ReadDay[]
        totalStats: TotalStats[]
        topFeeds: TopFeed[]
        feedHealth: FeedHealthRow[]
      }
    },
    enabled: !!user,
    staleTime: 60_000,
  })
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function daysSince(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return `${diff}d ago`
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useAnalytics()

  const totals = data?.totalStats?.[0]
  const topFeeds = data?.topFeeds ?? []
  const feedHealth = data?.feedHealth ?? []

  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of data?.readsPerDay ?? []) map.set(r.day, r.count)
    const days: { day: string; label: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd")
      days.push({ day: d, label: format(parseISO(d), "MMM d"), count: map.get(d) ?? 0 })
    }
    return days
  }, [data?.readsPerDay])

  const maxBar = topFeeds.length > 0 ? topFeeds[0].read_count : 1

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-red-500">Failed to load analytics. Make sure the analytics-stats function is deployed.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Read" value={totals?.total_read ?? 0} />
        <StatCard label="Total Saved" value={totals?.total_saved ?? 0} />
        <StatCard label="Today" value={totals?.read_today ?? 0} />
        <StatCard label="This Week" value={totals?.read_this_week ?? 0} />
        <StatCard label="This Month" value={totals?.read_this_month ?? 0} />
        <StatCard label="Streak" value={`${totals?.streak_days ?? 0}d`} sub="consecutive days" />
      </div>

      {/* Reads per day chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Articles Read — Last 30 Days</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 13, backgroundColor: "#1f2937", border: "none", color: "#fff" }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#readGrad)" strokeWidth={2} name="Articles" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top feeds & feed health side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top feeds */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Feeds</h2>
          {topFeeds.length === 0 ? (
            <p className="text-sm text-gray-400">No read data yet</p>
          ) : (
            <div className="space-y-3">
              {topFeeds.map((f, i) => (
                <div key={f.feed_id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.feed_title}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(f.read_count / maxBar) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{f.read_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feed health */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Feed Health</h2>
          {feedHealth.length === 0 ? (
            <p className="text-sm text-gray-400">No feeds yet</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                    <th className="pb-2">Feed</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Art/wk</th>
                    <th className="pb-2 text-right">Latest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {feedHealth.map(f => {
                    const isDead = f.latest_article && (Date.now() - new Date(f.latest_article).getTime()) > 30 * 86_400_000
                    return (
                      <tr key={f.feed_id}>
                        <td className="py-2 pr-3 max-w-[180px]">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{f.feed_title}</p>
                          {f.error_message && (
                            <p className="text-xs text-red-400 truncate mt-0.5">{f.error_message}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {f.status === "error" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Error
                            </span>
                          ) : isDead ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Dead
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                          {f.articles_per_week}
                        </td>
                        <td className="py-2 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {daysSince(f.latest_article)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
