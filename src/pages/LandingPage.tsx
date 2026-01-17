import { Link } from "react-router-dom"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Your RSS Feeds,
            <span className="text-primary-600 dark:text-primary-400"> Beautifully Organized</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            A modern, Feedly-like feed aggregator that helps you stay on top of your favorite content. Track what you've read, save articles for
            later, and organize feeds into collections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth"
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started Free
            </Link>
            <button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }}
              className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-lg text-lg font-semibold transition-colors"
            >
              Learn More
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">✨ Try demo mode - no signup required</p>
        </div>

        {/* Screenshot/Demo */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-purple-400 rounded-2xl blur-3xl opacity-20"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden">
              {/* Replace 'feed-vine-hero.png' with your actual screenshot filename */}
              <img
                src="/feed-vine-hero.png"
                alt="FeedVine RSS Aggregator Dashboard"
                className="w-full h-full object-cover object-top"
                onError={e => {
                  // Fallback to placeholder if image doesn't exist
                  e.currentTarget.style.display = "none"
                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                  if (placeholder) placeholder.style.display = "flex"
                }}
              />
              {/* Placeholder shown if image doesn't exist */}
              <div className="hidden w-full h-full items-center justify-center">
                <div className="text-center">
                  <svg className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">Add your screenshot to /public/feed-vine-hero.png</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">Everything You Need</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-4">Start free, upgrade when you need more</p>
          <p className="text-center text-sm text-green-600 dark:text-green-400 mb-12">💰 Save up to 21% with annual billing</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 flex flex-col ${
                  tier.popular ? "border-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/30" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {tier.popular && <span className="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">POPULAR</span>}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">{tier.name}</h3>
                <div className="mt-4 mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">${tier.annualPrice}</span>
                    <span className="text-gray-600 dark:text-gray-400">/mo</span>
                  </div>
                  {tier.price > 0 && tier.price !== tier.annualPrice && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">${tier.price}/mo billed monthly</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-gray-600 dark:text-gray-400 ${feature.includes("Everything in") ? "font-semibold" : ""}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Link
                    to="/auth"
                    className={`block text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                      tier.popular
                        ? "bg-primary-600 hover:bg-primary-700 text-white"
                        : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">Ready to Get Organized?</h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Join thousands of users who stay on top of their content with FeedVine</p>
        <Link
          to="/auth"
          className="inline-block px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
        >
          Start Free Today
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">FeedVine</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your RSS feeds, beautifully organized.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:support@rssaggregator.com" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">© 2026 RSS Aggregator. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: "✓",
    title: "Read/Unread Tracking",
    description: "Never lose track of what you've read. Articles auto-mark as read when you click them.",
  },
  {
    icon: "⭐",
    title: "Save for Later",
    description: "Bookmark important articles and access them anytime from your Saved page.",
  },
  {
    icon: "📁",
    title: "Organize with Categories",
    description: "Group your feeds into categories like Tech, AI, News, and more.",
  },
  {
    icon: "🔍",
    title: "Powerful Filters",
    description: "Search by keyword, filter by source, date range, or show only unread articles.",
  },
  {
    icon: "⌨️",
    title: "Keyboard Shortcuts",
    description: "Navigate like a pro with j/k navigation, m to mark read, s to save, and more.",
  },
  {
    icon: "🔗",
    title: "Export & Integrate",
    description: "Export your feed for Zapier, IFTTT, or any RSS reader. Automate your workflow.",
  },
]

const pricingTiers = [
  {
    name: "Free",
    price: 0,
    annualPrice: 0,
    popular: false,
    features: ["1 RSS feed", "1 category", "Read/unread tracking", "Basic filters"],
    cta: "Start Free",
  },
  {
    name: "Pro",
    price: 6,
    annualPrice: 5,
    popular: false,
    features: ["Everything in Free, plus:", "5 feeds & 3 categories", "Save articles", "1 collection", "Export to RSS"],
    cta: "Go Pro",
  },
  {
    name: "Plus",
    price: 12,
    annualPrice: 10,
    popular: true,
    features: ["Everything in Pro, plus:", "15 feeds & 10 categories", "5 collections", "Advanced filters", "Keyboard shortcuts"],
    cta: "Go Plus",
  },
  {
    name: "Premium",
    price: 19,
    annualPrice: 15,
    popular: false,
    features: ["Everything in Plus, plus:", "25 feeds & categories", "25 collections", "API Access"],
    cta: "Go Premium",
  },
]
