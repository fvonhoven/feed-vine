import { useAuth } from "../hooks/useAuth"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import { mockArticles } from "../lib/mockData"
import { downloadRSSFeed, copyRSSFeedURL } from "../lib/rssGenerator"
import type { ArticleWithFeed } from "../types/database"
import toast from "react-hot-toast"
import { useState, useEffect } from "react"
import { useSubscription } from "../hooks/useSubscription"
import { PRICING_PLANS, getPlanPrice, getPlanPriceId, getPlanFeaturesArray, type BillingInterval, type PlanId } from "../lib/stripe"
import { useNavigate, useSearchParams } from "react-router-dom"

export default function SettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { subscription, planId: currentPlanId } = useSubscription()
  const [showFeedURL, setShowFeedURL] = useState(false)
  const [changingPlan, setChangingPlan] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)

  // Show success toast when returning from Stripe checkout
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      // Invalidate subscription query to refetch latest data
      queryClient.invalidateQueries({ queryKey: ["subscription"] })

      toast.success("🎉 Payment successful! Your subscription has been upgraded.", {
        duration: 5000,
      })

      // Remove success param from URL
      navigate("/settings", { replace: true })
    }
  }, [searchParams, navigate, queryClient])

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

  const handleManageSubscription = async () => {
    if (!user) {
      toast.error("Please sign in to manage subscription")
      return
    }

    setLoadingPortal(true)

    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: window.location.href },
      })

      if (error) throw error

      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error("No portal URL returned")
      }
    } catch (error: any) {
      console.error("Portal session error:", error)
      toast.error(error.message || "Failed to open billing portal. Please try again.")
      setLoadingPortal(false)
    }
  }

  const handleChangePlan = async (newPlanId: string, interval: BillingInterval) => {
    if (!user) {
      toast.error("Please sign in to change plans")
      return
    }

    if (newPlanId === currentPlanId) {
      toast.success("You're already on this plan!")
      return
    }

    // Determine if this is an upgrade or downgrade
    const planOrder = { free: 0, pro: 1, plus: 2, premium: 3 }
    const currentPlanOrder = planOrder[currentPlanId.toLowerCase() as keyof typeof planOrder]
    const newPlanOrder = planOrder[newPlanId.toLowerCase() as keyof typeof planOrder]
    const isDowngrade = newPlanOrder < currentPlanOrder

    if (isDowngrade) {
      // For downgrades, schedule change at period end
      const confirmMessage =
        newPlanId === "free"
          ? `Are you sure you want to cancel your subscription? Your ${PRICING_PLANS[currentPlanId.toUpperCase() as PlanId].name} plan will remain active until ${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "the end of your billing period"}, then you'll be downgraded to the Free plan.`
          : `Your plan will be downgraded to ${PRICING_PLANS[newPlanId.toUpperCase() as PlanId].name} at the end of your current billing period (${subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "end of period"}). You'll keep your current ${PRICING_PLANS[currentPlanId.toUpperCase() as PlanId].name} features until then.`

      if (!confirm(confirmMessage)) {
        return
      }

      setChangingPlan(true)

      try {
        const { data, error } = await supabase.functions.invoke("schedule-plan-change", {
          body: { newPlanId },
        })

        if (error) throw error

        if (data?.success) {
          toast.success(data.message || "Plan change scheduled successfully!")
          // Refresh subscription data
          queryClient.invalidateQueries({ queryKey: ["subscription"] })
        } else {
          throw new Error(data?.error || "Failed to schedule plan change")
        }
      } catch (error: any) {
        console.error("Downgrade error:", error)
        toast.error(error.message || "Failed to schedule downgrade. Please try again.")
      } finally {
        setChangingPlan(false)
      }
    } else {
      // For upgrades, proceed with immediate checkout
      const priceId = getPlanPriceId(newPlanId.toUpperCase() as any, interval)
      if (!priceId) {
        toast.error("Price ID not configured. Please contact support.")
        return
      }

      setChangingPlan(true)

      try {
        const { data, error } = await supabase.functions.invoke("create-checkout-session", {
          body: { priceId },
        })

        if (error) throw error

        if (data?.url) {
          window.location.href = data.url
        } else {
          throw new Error("No checkout URL returned")
        }
      } catch (error: any) {
        console.error("Plan change error:", error)
        toast.error(error.message || "Failed to change plan. Please try again.")
      } finally {
        setChangingPlan(false)
      }
    }
  }

  // Convert lowercase plan ID to uppercase for PRICING_PLANS lookup
  const planIdUpper = currentPlanId.toUpperCase() as PlanId
  const currentPlan = PRICING_PLANS[planIdUpper]
  const currentPlanFeatures = getPlanFeaturesArray(planIdUpper)

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

        {/* Subscription & Billing */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Subscription & Billing</h2>

          <div className="space-y-4">
            {/* Current Plan */}
            <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Plan</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{currentPlan.name}</p>
                  {subscription?.status && subscription.status !== "active" && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      Status: {subscription.status}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {planIdUpper === "FREE" ? "Free Forever" : `$${getPlanPrice(planIdUpper, "monthly")}/mo`}
                  </p>
                  {subscription?.current_period_end && planIdUpper !== "FREE" && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Plan Features */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Plan Includes:</p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {currentPlanFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-4 h-4 text-primary-600 dark:text-primary-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Change Plan */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Change Your Plan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(PRICING_PLANS)
                  .filter(([id]) => id !== planIdUpper)
                  .map(([id, plan]) => {
                    const planOrder = { FREE: 0, PRO: 1, PLUS: 2, PREMIUM: 3 }
                    const isDowngrade = planOrder[id as keyof typeof planOrder] < planOrder[planIdUpper]
                    const isCurrentPlan = id === planIdUpper

                    return (
                      <button
                        key={id}
                        onClick={() => handleChangePlan(id.toLowerCase(), "monthly")}
                        disabled={changingPlan || isCurrentPlan}
                        className={`p-4 border-2 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                          isCurrentPlan
                            ? "border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500"
                        }`}
                      >
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {plan.name}
                          {isCurrentPlan && <span className="ml-2 text-xs text-green-600 dark:text-green-400">(Current)</span>}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {id === "FREE" ? "Free" : `$${getPlanPrice(id as PlanId, "monthly")}/month`}
                        </p>
                        {!isCurrentPlan && (
                          <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
                            {isDowngrade ? "Downgrade at period end" : "Upgrade now"}
                          </p>
                        )}
                      </button>
                    )
                  })}
              </div>
              {planIdUpper !== "FREE" && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Upgrades take effect immediately. Downgrades take effect at the end of your current billing period (
                  {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "end of period"}).
                </p>
              )}
            </div>

            {/* Manage Subscription Button */}
            {planIdUpper !== "FREE" && subscription?.stripe_customer_id && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Need to update payment method or view invoices?</p>
                <button
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingPortal ? "Opening..." : "Manage Subscription →"}
                </button>
              </div>
            )}
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
