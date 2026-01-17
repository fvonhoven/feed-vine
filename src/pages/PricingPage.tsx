import { useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { PRICING_PLANS } from "../lib/stripe"
import { supabase } from "../lib/supabase"
import toast from "react-hot-toast"
import { Link } from "react-router-dom"

export default function PricingPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planId: string, priceId: string | null) => {
    if (!user) {
      toast.error("Please sign in to subscribe")
      return
    }

    if (planId === "free") {
      toast.success("You're already on the free plan!")
      return
    }

    if (!priceId) {
      toast.error("Price ID not configured. Please contact support.")
      return
    }

    setLoading(planId)

    try {
      // Call Supabase Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { priceId, userId: user.id },
      })

      if (error) throw error

      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error) {
      console.error("Subscription error:", error)
      toast.error("Failed to start checkout. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">Start free, upgrade when you need more features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {Object.entries(PRICING_PLANS).map(([key, plan]) => {
          const isPopular = key === "PLUS"

          return (
            <div
              key={key}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 relative ${
                isPopular ? "border-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/30" : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary-500 text-white text-xs font-semibold px-4 py-1 rounded-full">MOST POPULAR</span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                  <span className="text-gray-600 dark:text-gray-400">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-400">{plan.features.maxFeeds} RSS feeds</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-400">{plan.features.maxCategories} categories</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-400">Read/unread tracking</span>
                </li>
                {plan.features.savedArticles && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">Save articles</span>
                  </li>
                )}
                {plan.features.advancedFilters && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">Advanced filters</span>
                  </li>
                )}
                {plan.features.exportRSS && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">Export to RSS</span>
                  </li>
                )}
                {plan.features.keyboardShortcuts && (
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-primary-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">Keyboard shortcuts</span>
                  </li>
                )}
              </ul>

              <button
                onClick={() => handleSubscribe(key.toLowerCase(), plan.priceId)}
                disabled={loading === key.toLowerCase()}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                  isPopular
                    ? "bg-primary-600 hover:bg-primary-700 text-white"
                    : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === key.toLowerCase() ? "Loading..." : key === "FREE" ? "Current Plan" : `Subscribe to ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          By subscribing, you agree to our{" "}
          <Link to="/terms" className="text-primary-600 hover:text-primary-700 underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary-600 hover:text-primary-700 underline">
            Privacy Policy
          </Link>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">All plans include a 14-day money-back guarantee. Cancel anytime.</p>
      </div>
    </div>
  )
}
