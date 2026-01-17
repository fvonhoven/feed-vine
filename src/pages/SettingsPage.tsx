import { useAuth } from "../hooks/useAuth"
import { useQuery } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import { mockArticles } from "../lib/mockData"
import { downloadRSSFeed, copyRSSFeedURL } from "../lib/rssGenerator"
import type { ArticleWithFeed } from "../types/database"
import toast from "react-hot-toast"
import { useState } from "react"

export default function SettingsPage() {
  const { user } = useAuth()
  const [showFeedURL, setShowFeedURL] = useState(false)

  const { data: articles } = useQuery({
    queryKey: ["all-articles-for-export"],
    queryFn: async () => {
      if (isDemoMode) {
        return mockArticles
      }

      const { data, error } = await supabase
        .from("articles")
        .select(
          `
          *,
          feed:feeds(title, url)
        `,
        )
        .order("published_at", { ascending: false })
        .limit(100)

      if (error) throw error
      return data as ArticleWithFeed[]
    },
  })

  const handleDownloadFeed = () => {
    if (!articles || articles.length === 0) {
      toast.error("No articles to export")
      return
    }
    downloadRSSFeed(articles, user?.email || "user")
    toast.success("RSS feed downloaded!")
  }

  const handleCopyFeedURL = () => {
    copyRSSFeedURL(user?.email || "user")
    toast.success("Feed URL copied to clipboard!")
    setShowFeedURL(true)
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Manage your account settings</p>
      </div>

      <div className="space-y-6">
        {/* Account Info */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Export & Integration */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Export & Integration</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Export your aggregated feed to use with Zapier, IFTTT, or other RSS readers</p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadFeed}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download RSS Feed
              </button>

              <button
                onClick={handleCopyFeedURL}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Feed URL
              </button>
            </div>

            {showFeedURL && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your RSS Feed URL:</p>
                <code className="text-sm text-gray-900 dark:text-white break-all">
                  {window.location.origin}/api/feed/{encodeURIComponent(user?.email || "user")}.xml
                </code>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  <strong>Note:</strong> In production, this would be a unique, authenticated URL. Use this URL in Zapier, IFTTT, or any RSS reader to
                  access your aggregated feed.
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Integration Ideas</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Send new articles to Slack with Zapier</li>
                <li>• Auto-save to Notion or Evernote</li>
                <li>• Create email digests with IFTTT</li>
                <li>• Sync to your favorite RSS reader</li>
              </ul>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">About</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">FeedVine - MVP Version 1.0.0</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Built with React, TypeScript, Supabase, and Tailwind CSS</p>
        </div>
      </div>
    </div>
  )
}
