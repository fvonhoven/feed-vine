import FeedManager from '../components/FeedManager'

export default function FeedsPage() {
  return (
    <div className="px-4 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage feeds</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
          Add RSS sources, create <strong className="font-medium text-gray-800 dark:text-gray-200">categories</strong>, then use the{" "}
          <strong className="font-medium text-gray-800 dark:text-gray-200">Category</strong> dropdown on each feed to organize how they appear in the
          sidebar.
        </p>
      </div>

      <FeedManager />
    </div>
  )
}

