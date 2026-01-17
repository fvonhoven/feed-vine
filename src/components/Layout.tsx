import { Link, useLocation } from "react-router-dom"
import { isDemoMode } from "../lib/supabase"
import Sidebar from "./Sidebar"
import UserMenu from "./UserMenu"

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  // Check if we're on a page that should show the sidebar
  const showSidebar = location.pathname === "/" || location.pathname === "/saved"

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <svg className="w-8 h-8 text-primary-600" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M20 4L4 12L20 20L36 12L20 4Z"
                      fill="currentColor"
                      fillOpacity="0.2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path d="M4 20L20 28L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 28L20 36L36 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">FeedVine</h1>
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/")
                      ? "border-primary-500 text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Articles
                </Link>
                <Link
                  to="/discover"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/discover")
                      ? "border-primary-500 text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Discover
                </Link>
                <Link
                  to="/feeds"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/feeds")
                      ? "border-primary-500 text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Feeds
                </Link>
                <Link
                  to="/collections"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive("/collections")
                      ? "border-primary-500 text-gray-900 dark:text-white"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Collections
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>
      <div className="flex h-[calc(100vh-4rem)]">
        {showSidebar && <Sidebar />}
        <main className={`flex-1 overflow-y-auto ${showSidebar ? "" : "max-w-7xl mx-auto"} py-6 px-4 sm:px-6 lg:px-8`}>{children}</main>
      </div>
    </div>
  )
}
