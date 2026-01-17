import FeedManager from '../components/FeedManager'

export default function FeedsPage() {
  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Feeds</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Add and manage your RSS feed sources
        </p>
      </div>

      <FeedManager />
    </div>
  )
}

