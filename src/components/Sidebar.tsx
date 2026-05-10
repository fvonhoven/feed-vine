import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import type { Category, Feed, FeedCollection } from "../types/database"
import { useAuth } from "../hooks/useAuth"
import { featureFlags } from "../lib/featureFlags"
import { useSubscription } from "../hooks/useSubscription"
import { useTeam } from "../hooks/useTeam"
import { LIST_GC_MS, LIST_STALE_MS } from "../lib/queryConfig"

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onClose: () => void
  onToggleCollapse: () => void
}

export default function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const location = useLocation()
  const { hasFeature } = useSubscription()
  const [feedsQuickNavOpen, setFeedsQuickNavOpen] = useState(false)

  useEffect(() => {
    if (location.pathname.startsWith("/feed/")) {
      setFeedsQuickNavOpen(true)
    }
  }, [location.pathname])

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
    staleTime: LIST_STALE_MS,
    gcTime: LIST_GC_MS,
    queryFn: async () => {
      if (isDemoMode) {
        return []
      }
      const { data, error } = await supabase.from("feeds").select("*").order("title")
      if (error) throw error
      return data as Feed[]
    },
  })

  const { user } = useAuth()
  const { team } = useTeam()

  const { data: teamCollections } = useQuery({
    queryKey: ["sidebar-team-collections", team?.id],
    queryFn: async () => {
      if (!team || isDemoMode) return []
      const { data, error } = await supabase
        .from("feed_collections")
        .select("id, name, slug")
        .eq("team_id", team.id)
        .order("name")
      if (error) throw error
      return data as Pick<FeedCollection, "id" | "name" | "slug">[]
    },
    enabled: featureFlags.teams && !!team && !isDemoMode,
  })

  const { data: subscribedCollections } = useQuery({
    queryKey: ["sidebar-subscriptions"],
    queryFn: async () => {
      if (!user || isDemoMode) return []

      const { data, error } = await supabase
        .from("marketplace_subscriptions")
        .select(
          `
          collection:feed_collections (
            id,
            name,
            slug
          )
        `,
        )
        .eq("subscriber_id", user.id)

      if (error) throw error

      // Flatten the structure
      return data.map((item: any) => item.collection) as Pick<FeedCollection, "id" | "name" | "slug">[]
    },
    enabled: !!user && !isDemoMode,
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

  const feedCount = feeds?.length ?? 0

  const feedQuickNavTree = (onFeedClick?: () => void) => (
    <nav className="space-y-2">
      {categories?.map(category => (
        <div key={category.id}>
          <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="flex items-center">
              <span className="w-3 h-3 rounded-full mr-3 shrink-0" style={{ backgroundColor: category.color }}></span>
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
              onClick={onFeedClick}
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
              onClick={onFeedClick}
              className="flex items-center justify-between pl-9 pr-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <span className="truncate">{feed.title}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden lg:block bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="p-4">
          {/* Desktop collapse toggle button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>
          {!isCollapsed && <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Views</h2>}
          <nav className="space-y-1">
            <Link
              to="/"
              className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 text-sm rounded-md ${
                isActive("/")
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title={isCollapsed ? "All Articles" : ""}
            >
              <span className="flex items-center">
                <svg className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
                {!isCollapsed && "All Articles"}
              </span>
              {!isCollapsed && isDemoMode && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">5</span>}
            </Link>

            <Link
              to="/search"
              className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 text-sm rounded-md ${
                isActive("/search")
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title={isCollapsed ? "Search" : ""}
            >
              <span className="flex items-center">
                <svg className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {!isCollapsed && "Search"}
              </span>
            </Link>

            <Link
              to="/saved"
              className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 text-sm rounded-md ${
                isActive("/saved")
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title={isCollapsed ? "Saved" : ""}
            >
              <span className="flex items-center">
                <svg className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {!isCollapsed && "Saved"}
              </span>
              {!isCollapsed && isDemoMode && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">2</span>}
            </Link>

            {isCollapsed && (
              <Link
                to="/feeds"
                className={`flex items-center justify-center px-3 py-2 text-sm rounded-md ${
                  isActive("/feeds")
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Manage feeds"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-7 7h.01M6 19h.01"
                  />
                </svg>
              </Link>
            )}

            {hasFeature("apiAccess") && (
              <Link
                to="/api-keys"
                className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 text-sm rounded-md ${
                  isActive("/api-keys")
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title={isCollapsed ? "API Keys" : ""}
              >
                <span className="flex items-center">
                  <svg className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                  {!isCollapsed && "API Keys"}
                </span>
              </Link>
            )}

            {hasFeature("webhooks") && (
              <Link
                to="/webhooks"
                className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 text-sm rounded-md ${
                  isActive("/webhooks")
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title={isCollapsed ? "Webhooks" : ""}
              >
                <span className="flex items-center">
                  <svg className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {!isCollapsed && "Webhooks"}
                </span>
              </Link>
            )}

            <Link
              to="/digest"
              className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 text-sm rounded-md ${
                isActive("/digest")
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title={isCollapsed ? "Newsletter Digest" : ""}
            >
              <span className="flex items-center">
                <svg className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {!isCollapsed && "Newsletter"}
              </span>
            </Link>

            <Link
              to="/analytics"
              className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 text-sm rounded-md ${
                isActive("/analytics")
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title={isCollapsed ? "Analytics" : ""}
            >
              <span className="flex items-center">
                <svg className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {!isCollapsed && "Analytics"}
              </span>
            </Link>

            {featureFlags.teams && hasFeature("teamWorkspaces") && (
              <Link
                to="/team"
                className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2 text-sm rounded-md ${
                  location.pathname === "/team"
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title={isCollapsed ? "Team" : ""}
              >
                <span className="flex items-center">
                  <svg className={`w-5 h-5 ${isCollapsed ? "" : "mr-3"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {!isCollapsed && "Team"}
                </span>
              </Link>
            )}
          </nav>

          {!isCollapsed && featureFlags.teams && teamCollections && teamCollections.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-3">Team Collections</h2>
              <nav className="space-y-1">
                {teamCollections.map(collection => (
                  <Link
                    key={collection.id}
                    to={`/collection/${collection.id}`}
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    <span className="truncate">{collection.name}</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">team</span>
                  </Link>
                ))}
              </nav>
            </>
          )}

          {!isCollapsed && subscribedCollections && subscribedCollections.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-3">Subscriptions</h2>
              <nav className="space-y-1">
                {subscribedCollections.map(collection => (
                  <Link
                    key={collection.id}
                    to={`/collection/${collection.id}`}
                    className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    <span className="truncate">{collection.name}</span>
                  </Link>
                ))}
              </nav>
            </>
          )}

          {!isCollapsed && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 shrink-0">Feeds</span>
                <div className="ml-auto flex min-w-0 flex-row-reverse items-center gap-2">
                  {/* Button first in DOM so Link stacks above it for hit-testing (avoids expand control covering Manage). */}
                  <button
                    type="button"
                    onClick={() => setFeedsQuickNavOpen(o => !o)}
                    className="flex shrink-0 items-center gap-2 rounded p-0.5 -mr-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-expanded={feedsQuickNavOpen}
                    aria-label={feedsQuickNavOpen ? "Collapse feeds list" : "Expand feeds list"}
                  >
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded tabular-nums">{feedCount}</span>
                    <svg
                      className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${feedsQuickNavOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Link
                    to="/feeds"
                    className={`relative z-10 text-[11px] shrink-0 underline leading-none ${
                      isActive("/feeds")
                        ? "text-primary-700 dark:text-primary-400 font-medium"
                        : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    }`}
                  >
                    Manage
                  </Link>
                </div>
              </div>
              {feedsQuickNavOpen && feedCount > 0 && (
                <div className="mt-2 max-h-[min(50vh,24rem)] overflow-y-auto pr-1">{feedQuickNavTree()}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto">
          <div className="p-4">
            {/* Mobile close button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Views</h2>
            <nav className="space-y-1">
              <Link
                to="/"
                onClick={onClose}
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
                to="/search"
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                  isActive("/search")
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </span>
              </Link>

              <Link
                to="/saved"
                onClick={onClose}
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

              {hasFeature("apiAccess") && (
                <Link
                  to="/api-keys"
                  onClick={onClose}
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
              )}

              {hasFeature("webhooks") && (
                <Link
                  to="/webhooks"
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                    isActive("/webhooks")
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Webhooks
                  </span>
                </Link>
              )}

              <Link
                to="/analytics"
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                  isActive("/analytics")
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </span>
              </Link>

              {featureFlags.teams && hasFeature("teamWorkspaces") && (
                <Link
                  to="/team"
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                    isActive("/team")
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Team
                  </span>
                </Link>
              )}
            </nav>

            {featureFlags.teams && teamCollections && teamCollections.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-3">Team Collections</h2>
                <nav className="space-y-1">
                  {teamCollections.map(collection => (
                    <Link
                      key={collection.id}
                      to={`/collection/${collection.id}`}
                      onClick={onClose}
                      className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <span className="truncate">{collection.name}</span>
                      <span className="text-xs text-blue-500 dark:text-blue-400">team</span>
                    </Link>
                  ))}
                </nav>
              </>
            )}

            {subscribedCollections && subscribedCollections.length > 0 && (
              <>
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-3">Subscriptions</h2>
                <nav className="space-y-1">
                  {subscribedCollections.map(collection => (
                    <Link
                      key={collection.id}
                      to={`/collection/${collection.id}`}
                      onClick={onClose}
                      className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <span className="truncate">{collection.name}</span>
                    </Link>
                  ))}
                </nav>
              </>
            )}

            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 shrink-0">Feeds</span>
                <div className="ml-auto flex min-w-0 flex-row-reverse items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedsQuickNavOpen(o => !o)}
                    className="flex shrink-0 items-center gap-2 rounded p-0.5 -mr-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-expanded={feedsQuickNavOpen}
                    aria-label={feedsQuickNavOpen ? "Collapse feeds list" : "Expand feeds list"}
                  >
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded tabular-nums">{feedCount}</span>
                    <svg
                      className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${feedsQuickNavOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Link
                    to="/feeds"
                    onClick={onClose}
                    className={`relative z-10 text-[11px] shrink-0 underline leading-none ${
                      isActive("/feeds")
                        ? "text-primary-700 dark:text-primary-400 font-medium"
                        : "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    }`}
                  >
                    Manage
                  </Link>
                </div>
              </div>
              {feedsQuickNavOpen && feedCount > 0 && (
                <div className="mt-2 max-h-[min(50vh,24rem)] overflow-y-auto pr-1">{feedQuickNavTree(onClose)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
