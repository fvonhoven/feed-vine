import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { isDemoMode } from "../lib/supabase"
import Sidebar from "./Sidebar"
import UserMenu from "./UserMenu"

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const isActive = (path: string) => location.pathname === path

  const showSidebar = true

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isDemoMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
              <span className="font-semibold">Demo Mode:</span> You're viewing sample data. Add your Supabase credentials to{" "}
              <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">.env.local</code> to use real data.
            </p>
          </div>
        </div>
      )}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0"
                aria-label="Toggle menu"
                aria-expanded={sidebarOpen}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <div className="flex-shrink-0 flex items-center min-w-0">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <svg className="w-8 h-8 text-primary-600 shrink-0" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M20 4L4 12L20 20L36 12L20 4Z"
                      fill="currentColor"
                      fillOpacity="0.3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path d="M4 20L20 28L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 28L20 36L36 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block truncate">FeedVine</h1>
                </Link>
              </div>
              <div className="hidden md:ml-4 md:flex md:items-center md:gap-6 lg:gap-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                    isActive("/")
                      ? "border-primary-500 text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Articles
                </Link>
                <Link
                  to="/explore"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                    isActive("/explore")
                      ? "border-primary-500 text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Explore
                </Link>
                <Link
                  to="/collections"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                    isActive("/collections")
                      ? "border-primary-500 text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Collections
                </Link>
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] relative">
        {showSidebar && sidebarOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        {showSidebar && (
          <Sidebar
            isOpen={sidebarOpen}
            isCollapsed={sidebarCollapsed}
            onClose={() => setSidebarOpen(false)}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        <main className={`flex-1 overflow-y-auto ${showSidebar ? "" : "max-w-7xl mx-auto w-full"} py-3 sm:py-6 px-3 sm:px-6 lg:px-8`}>
          {children}
        </main>
      </div>
    </div>
  )
}
