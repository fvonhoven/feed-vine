import { useSearchParams, Link } from "react-router-dom"
import DiscoverFeedsSection from "../components/explore/DiscoverFeedsSection"
import MarketplaceCollectionsSection from "../components/explore/MarketplaceCollectionsSection"

type ExploreTab = "collections" | "feeds"

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const tab: ExploreTab = tabParam === "feeds" ? "feeds" : "collections"

  const setTab = (next: ExploreTab) => {
    setSearchParams(next === "collections" ? {} : { tab: "feeds" }, { replace: true })
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Explore</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Subscribe to community collections or add popular RSS feeds to your reading list.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 mb-8">
        <button
          type="button"
          onClick={() => setTab("collections")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "collections"
              ? "border-primary-500 text-primary-600 dark:text-primary-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Collections
        </button>
        <button
          type="button"
          onClick={() => setTab("feeds")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "feeds"
              ? "border-primary-500 text-primary-600 dark:text-primary-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Popular feeds
        </button>
      </div>

      {tab === "collections" ? <MarketplaceCollectionsSection /> : <DiscoverFeedsSection />}

      <p className="mt-10 text-sm text-gray-500 dark:text-gray-400">
        To add feeds by URL or change how they are grouped in the sidebar, go to{" "}
        <Link to="/feeds" className="text-primary-600 dark:text-primary-400 hover:underline">
          Manage feeds
        </Link>
        .
      </p>
    </div>
  )
}
