import { useState } from "react"
import { useAuth } from "../hooks/useAuth"
import { useSubscription } from "../hooks/useSubscription"
import { PRICING_PLANS, PLAN_DISPLAY, INDIVIDUAL_PLAN_KEYS, TEAM_PLAN_KEYS, getPlanPrice, getPlanPriceId, getAnnualSavings, formatPrice, type BillingInterval } from "../lib/stripe"
import { supabase } from "../lib/supabase"
import toast from "react-hot-toast"
import { Link } from "react-router-dom"

export default function PricingPage() {
  const { user } = useAuth()
  const { planId: currentPlanId } = useSubscription()
  const [loading, setLoading] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("annual")

  const handleSubscribe = async (planId: string, interval: BillingInterval) => {
    if (!user) {
      toast.error("Please sign in to subscribe")
      return
    }

    if (planId === "free") {
      toast.success("You're already on the free plan!")
      return
    }

    const priceId = getPlanPriceId(planId.toUpperCase() as any, interval)
    if (!priceId) {
      toast.error("Price ID not configured. Please contact support.")
      return
    }

    setLoading(planId)

    try {
      // Check if user has a valid session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      console.log("User session:", session)
      console.log("Access token present:", !!session?.access_token)

      // Call Supabase Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { priceId },
      })

      console.log("Function response data:", data)
      console.log("Function response error:", error)

      if (error) {
        console.error("Function invocation error:", error)
        throw error
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error: any) {
      console.error("Subscription error:", error)
      console.error("Error details:", error.message, error.details)
      toast.error(error.message || "Failed to start checkout. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Start free, upgrade when you need more power</p>
        {billingInterval === "annual" && (
          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-6">
            🎉 Annual plans include a 30-day free trial — card required, cancel anytime
          </p>
        )}
        {billingInterval === "monthly" && <div className="mb-6" />}

        {/* Billing Toggle */}
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === "monthly"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("annual")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors relative ${
              billingInterval === "annual"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Annual
            <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
              30 days free + save 25%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {Object.entries(PRICING_PLANS)
          .filter(([key]) => !["TEAM", "TEAM_PRO", "TEAM_BUSINESS"].includes(key))
          .map(([key, plan]) => {
            const isPopular = key === "PLUS"
            const planId = key as keyof typeof PRICING_PLANS
            const price = getPlanPrice(planId, billingInterval)
            const savings = getAnnualSavings(planId)
            const isCurrentPlan = currentPlanId === planId

            return (
              <div
                key={key}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 relative flex flex-col transition-all hover:shadow-2xl hover:scale-105 ${
                  isCurrentPlan
                    ? "border-green-500 ring-4 ring-green-100 dark:ring-green-900/30"
                    : isPopular
                      ? "border-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700"
                }`}
              >
                {isCurrentPlan ? (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white text-xs font-semibold px-4 py-1 rounded-full">CURRENT PLAN</span>
                  </div>
                ) : isPopular ? (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                      {billingInterval === "annual" ? "⭐ MOST POPULAR" : "MOST POPULAR"}
                    </span>
                  </div>
                ) : null}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    {billingInterval === "annual" && plan.annualPrice > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">30 days free, then</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-bold text-gray-900 dark:text-white">${price}</span>
                          <span className="text-gray-600 dark:text-gray-400">/mo</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-through">${plan.monthlyPrice}/mo</span>
                          <span className="ml-2 text-sm font-semibold text-green-600 dark:text-green-400">Save {savings}%</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Billed ${formatPrice(price * 12)}/year after trial</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-bold text-gray-900 dark:text-white">${price}</span>
                          <span className="text-gray-600 dark:text-gray-400">/mo</span>
                        </div>
                        {plan.monthlyPrice > 0 && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">No free trial on monthly</p>}
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 text-sm">
                  {/* FREE */}
                  {key === "FREE" && (
                    <>
                      {[
                        `${plan.features.maxFeeds} RSS feeds`,
                        `${plan.features.maxCategories} categories`,
                        "Read / unread tracking",
                        "Search & basic filters",
                        "Usage analytics dashboard",
                        "Installable PWA",
                      ].map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600 dark:text-gray-400">{f}</span>
                        </li>
                      ))}
                    </>
                  )}

                  {/* STARTER (PRO) */}
                  {key === "PRO" && (
                    <>
                      {[
                        { label: "Everything in Free, plus:", bold: true },
                        { label: `${plan.features.maxFeeds} RSS feeds` },
                        { label: `${plan.features.maxCategories} categories` },
                        { label: `${plan.features.maxCollections} collection` },
                        { label: "Save articles for later" },
                        { label: "Article search" },
                        { label: "Keyboard shortcuts" },
                        { label: "OPML import & export" },
                      ].map(({ label, bold }) => (
                        <li key={label} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={`text-gray-600 dark:text-gray-400${bold ? " font-semibold" : ""}`}>{label}</span>
                        </li>
                      ))}
                    </>
                  )}

                  {/* CREATOR (PLUS) */}
                  {key === "PLUS" && (
                    <>
                      {[
                        { label: "Everything in Starter, plus:", bold: true },
                        { label: `${plan.features.maxFeeds} RSS feeds` },
                        { label: `${plan.features.maxCollections} collections` },
                        { label: "Full-text article fetch" },
                        { label: "AI summaries — 200/month" },
                        { label: "Webhooks (Zapier/Make) — up to 5" },
                        { label: "Newsletter export (Beehiiv & MailerLite)" },
                        { label: "Scheduled auto-draft digests" },
                        { label: "Digest history & quiet hours" },
                        { label: "Advanced keyword filters" },
                      ].map(({ label, bold }) => (
                        <li key={label} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={`text-gray-600 dark:text-gray-400${bold ? " font-semibold" : ""}`}>{label}</span>
                        </li>
                      ))}
                    </>
                  )}

                  {/* BUILDER (PREMIUM) */}
                  {key === "PREMIUM" && (
                    <>
                      {[
                        { label: "Everything in Creator, plus:", bold: true },
                        { label: "Unlimited feeds & categories" },
                        { label: "Unlimited collections" },
                        { label: "Unlimited AI summaries" },
                        { label: "Unlimited webhooks" },
                        { label: "Public REST API access" },
                        { label: "Priority email support" },
                      ].map(({ label, bold }) => (
                        <li key={label} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={`text-gray-600 dark:text-gray-400${bold ? " font-semibold" : ""}`}>{label}</span>
                        </li>
                      ))}
                    </>
                  )}

                </ul>

                <div className="mt-auto">
                  {key !== "FREE" && !isCurrentPlan && (
                    <button
                      onClick={() => handleSubscribe(key.toLowerCase(), billingInterval)}
                      disabled={loading === key.toLowerCase()}
                      className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors mb-2 ${
                        isPopular
                          ? "bg-primary-600 hover:bg-primary-700 text-white"
                          : "bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300 text-white dark:text-gray-900"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading === key.toLowerCase()
                        ? "Loading..."
                        : billingInterval === "annual"
                          ? `Start Free Trial — ${plan.name}`
                          : `Subscribe Monthly — ${plan.name}`}
                    </button>
                  )}
                  {key !== "FREE" && !isCurrentPlan && billingInterval === "annual" && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                      Or{" "}
                      <button onClick={() => setBillingInterval("monthly")} className="underline hover:text-gray-600 dark:hover:text-gray-300">
                        pay monthly at ${plan.monthlyPrice}/mo
                      </button>{" "}
                      — no trial
                    </p>
                  )}
                  {(key === "FREE" || isCurrentPlan) && (
                    <button
                      disabled
                      className="w-full px-6 py-3 rounded-lg font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 cursor-not-allowed"
                    >
                      {isCurrentPlan ? "Current Plan" : "Free — No card needed"}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {/* Team Plans Section */}
      <div className="mt-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🏢 For Teams</h2>
          <p className="text-gray-600 dark:text-gray-400">Collaborative workspaces built for content teams</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {Object.entries(PRICING_PLANS)
            .filter(([key]) => ["TEAM", "TEAM_PRO", "TEAM_BUSINESS"].includes(key))
            .map(([key, plan]) => {
              const isPopular = key === "TEAM_PRO"
              const planId = key as keyof typeof PRICING_PLANS
              const price = getPlanPrice(planId, billingInterval)
              const savings = getAnnualSavings(planId)
              const isCurrentPlan = currentPlanId === planId

              return (
                <div
                  key={key}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 relative flex flex-col transition-all hover:shadow-2xl hover:scale-105 ${
                    isCurrentPlan
                      ? "border-green-500 ring-4 ring-green-100 dark:ring-green-900/30"
                      : isPopular
                        ? "border-purple-500 ring-4 ring-purple-100 dark:ring-purple-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                  }`}
                >
                  {isCurrentPlan ? (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-semibold px-4 py-1 rounded-full">CURRENT PLAN</span>
                    </div>
                  ) : isPopular ? (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-purple-500 text-white text-xs font-semibold px-4 py-1 rounded-full">MOST POPULAR</span>
                    </div>
                  ) : null}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-4">Up to {plan.features.maxTeamMembers} seats</p>
                    {billingInterval === "annual" && plan.annualPrice > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">30 days free, then</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-bold text-gray-900 dark:text-white">${price}</span>
                          <span className="text-gray-600 dark:text-gray-400">/mo</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-through">${plan.monthlyPrice}/mo</span>
                          <span className="ml-2 text-sm font-semibold text-green-600 dark:text-green-400">Save {savings}%</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Billed ${formatPrice(price * 12)}/year after trial</p>
                      </>
                    ) : (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold text-gray-900 dark:text-white">${price}</span>
                        <span className="text-gray-600 dark:text-gray-400">/mo</span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 text-sm">
                    {key === "TEAM" &&
                      [
                        { label: "Everything in Builder, plus:", bold: true },
                        { label: "5-seat team workspace" },
                        { label: "Admin & member roles" },
                        { label: "Shared team collections" },
                        { label: "Slack bot integration" },
                        { label: "Discord bot integration" },
                      ].map(({ label, bold }) => (
                        <li key={label} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={`text-gray-600 dark:text-gray-400${bold ? " font-semibold" : ""}`}>{label}</span>
                        </li>
                      ))}
                    {key === "TEAM_PRO" &&
                      [
                        { label: "Everything in Team Starter, plus:", bold: true },
                        { label: "15-seat team workspace" },
                        { label: "Priority email support" },
                        { label: "Best value for growing teams" },
                      ].map(({ label, bold }) => (
                        <li key={label} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={`text-gray-600 dark:text-gray-400${bold ? " font-semibold" : ""}`}>{label}</span>
                        </li>
                      ))}
                    {key === "TEAM_BUSINESS" &&
                      [
                        { label: "Everything in Team Pro, plus:", bold: true },
                        { label: "30-seat team workspace" },
                        { label: "Lowest per-seat cost" },
                        { label: "Priority email support" },
                      ].map(({ label, bold }) => (
                        <li key={label} className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={`text-gray-600 dark:text-gray-400${bold ? " font-semibold" : ""}`}>{label}</span>
                        </li>
                      ))}
                  </ul>

                  <div className="mt-auto">
                    {!isCurrentPlan && (
                      <button
                        onClick={() => handleSubscribe(key.toLowerCase(), billingInterval)}
                        disabled={loading === key.toLowerCase()}
                        className="w-full px-6 py-3 rounded-lg font-semibold transition-colors mb-2 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading === key.toLowerCase()
                          ? "Loading..."
                          : billingInterval === "annual"
                            ? `Start Free Trial — ${plan.name}`
                            : `Subscribe Monthly — ${plan.name}`}
                      </button>
                    )}
                    {!isCurrentPlan && billingInterval === "annual" && (
                      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                        Or{" "}
                        <button onClick={() => setBillingInterval("monthly")} className="underline hover:text-gray-600 dark:hover:text-gray-300">
                          pay monthly at ${plan.monthlyPrice}/mo
                        </button>{" "}
                        — no trial
                      </p>
                    )}
                    {isCurrentPlan && (
                      <button
                        disabled
                        className="w-full px-6 py-3 rounded-lg font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          By subscribing, you agree to our{" "}
          <Link to="/terms" className="text-primary-600 hover:text-primary-700 underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary-600 hover:text-primary-700 underline">
            Privacy Policy
          </Link>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Annual plans include a 30-day free trial. Cancel before trial ends and you won't be charged. No questions asked.
        </p>
      </div>
    </div>
  )
}
