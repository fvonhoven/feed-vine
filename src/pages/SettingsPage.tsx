import { useAuth } from "../hooks/useAuth"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { supabase, isDemoMode } from "../lib/supabase"
import { downloadRSSFeed, copyRSSFeedURL } from "../lib/rssGenerator"
import type { ArticleWithFeed } from "../types/database"
import toast from "react-hot-toast"
import { useState, useEffect } from "react"
import { useSubscription } from "../hooks/useSubscription"
import { useTeam } from "../hooks/useTeam"
import { PRICING_PLANS, getPlanPrice, getPlanPriceId, getPlanFeaturesArray, type BillingInterval, type PlanId } from "../lib/stripe"
import { useNavigate, useSearchParams } from "react-router-dom"

export default function SettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { subscription, planId: currentPlanId, isLoading: subscriptionLoading, hasFeature } = useSubscription()
  const { team } = useTeam()
  const [showFeedURL, setShowFeedURL] = useState(false)
  const [changingPlan, setChangingPlan] = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [beehiivApiKey, setBeehiivApiKey] = useState("")
  const [beehiivPublicationId, setBeehiivPublicationId] = useState("")
  const [mailerLiteApiKey, setMailerLiteApiKey] = useState("")
  const [mailerLiteFromEmail, setMailerLiteFromEmail] = useState("")
  const [mailerLiteFromName, setMailerLiteFromName] = useState("")

  // Debug: Log subscription data
  console.log("SettingsPage - Subscription data:", { subscription, currentPlanId, subscriptionLoading })

  // Show success toast when returning from Stripe checkout or bot OAuth
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      queryClient.invalidateQueries({ queryKey: ["subscription"] })
      toast.success("Payment successful! Your subscription has been upgraded.", { duration: 5000 })
      navigate("/settings", { replace: true })
    }
    if (searchParams.get("slack") === "connected") {
      queryClient.invalidateQueries({ queryKey: ["slack-installation"] })
      toast.success("Slack workspace connected!", { duration: 5000 })
      navigate("/settings", { replace: true })
    }
    if (searchParams.get("discord") === "connected") {
      queryClient.invalidateQueries({ queryKey: ["discord-installation"] })
      toast.success("Discord server connected!", { duration: 5000 })
      navigate("/settings", { replace: true })
    }
  }, [searchParams, navigate, queryClient])

  const { data: articles } = useQuery({
    queryKey: ["all-articles-for-export"],
    queryFn: async () => {
      if (isDemoMode) {
        return []
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

  // Beehiiv integration query
  const { data: beehiivIntegration } = useQuery({
    queryKey: ["integration-beehiiv"],
    queryFn: async () => {
      if (isDemoMode || !user) return null
      const { data } = await supabase.from("user_integrations").select("api_key, publication_id").eq("provider", "beehiiv").maybeSingle()
      return data as { api_key: string; publication_id: string | null } | null
    },
    enabled: !isDemoMode && !!user,
  })

  // Pre-fill form when integration data loads
  useEffect(() => {
    if (beehiivIntegration) {
      setBeehiivApiKey(beehiivIntegration.api_key || "")
      setBeehiivPublicationId(beehiivIntegration.publication_id || "")
    }
  }, [beehiivIntegration])

  const saveBeehiivMutation = useMutation({
    mutationFn: async ({ apiKey, publicationId }: { apiKey: string; publicationId: string }) => {
      if (isDemoMode) throw new Error("Demo mode: Connect Supabase to save integrations")
      const { error } = await supabase
        .from("user_integrations")
        .upsert({ user_id: user!.id, provider: "beehiiv", api_key: apiKey, publication_id: publicationId }, { onConflict: "user_id,provider" })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Beehiiv integration saved!")
      queryClient.invalidateQueries({ queryKey: ["integration-beehiiv"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save integration")
    },
  })

  const disconnectBeehiivMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) throw new Error("Demo mode")
      const { error } = await supabase.from("user_integrations").delete().eq("provider", "beehiiv")
      if (error) throw error
    },
    onSuccess: () => {
      setBeehiivApiKey("")
      setBeehiivPublicationId("")
      toast.success("Beehiiv disconnected")
      queryClient.invalidateQueries({ queryKey: ["integration-beehiiv"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to disconnect")
    },
  })

  // MailerLite integration
  const { data: mailerLiteIntegration } = useQuery({
    queryKey: ["integration-mailerlite"],
    queryFn: async () => {
      if (isDemoMode || !user) return null
      const { data } = await supabase.from("user_integrations").select("api_key, publication_id").eq("provider", "mailerlite").maybeSingle()
      return data as { api_key: string; publication_id: string | null } | null
    },
    enabled: !isDemoMode && !!user,
  })

  useEffect(() => {
    if (mailerLiteIntegration) {
      setMailerLiteApiKey(mailerLiteIntegration.api_key || "")
      try {
        const parsed = mailerLiteIntegration.publication_id ? JSON.parse(mailerLiteIntegration.publication_id) : {}
        setMailerLiteFromEmail(parsed.from_email || "")
        setMailerLiteFromName(parsed.from_name || "")
      } catch {
        setMailerLiteFromEmail("")
        setMailerLiteFromName("")
      }
    }
  }, [mailerLiteIntegration])

  const saveMailerLiteMutation = useMutation({
    mutationFn: async ({ apiKey, fromEmail, fromName }: { apiKey: string; fromEmail: string; fromName: string }) => {
      if (isDemoMode) throw new Error("Demo mode: Connect Supabase to save integrations")
      const senderMeta = JSON.stringify({ from_email: fromEmail, from_name: fromName })
      const { error } = await supabase
        .from("user_integrations")
        .upsert({ user_id: user!.id, provider: "mailerlite", api_key: apiKey, publication_id: senderMeta }, { onConflict: "user_id,provider" })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("MailerLite integration saved!")
      queryClient.invalidateQueries({ queryKey: ["integration-mailerlite"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save integration")
    },
  })

  const disconnectMailerLiteMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) throw new Error("Demo mode")
      const { error } = await supabase.from("user_integrations").delete().eq("provider", "mailerlite")
      if (error) throw error
    },
    onSuccess: () => {
      setMailerLiteApiKey("")
      setMailerLiteFromEmail("")
      setMailerLiteFromName("")
      toast.success("MailerLite disconnected")
      queryClient.invalidateQueries({ queryKey: ["integration-mailerlite"] })
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to disconnect")
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
      // For upgrades, check if user already has a subscription
      const hasExistingSubscription = subscription?.stripe_subscription_id

      setChangingPlan(true)

      try {
        if (hasExistingSubscription) {
          // User has existing subscription - update it with proration
          const { data, error } = await supabase.functions.invoke("upgrade-subscription", {
            body: { newPlanId, interval },
          })

          if (error) throw error

          if (data?.success) {
            toast.success(data.message || "Successfully upgraded! Your account has been updated.")
            // Refresh subscription data
            queryClient.invalidateQueries({ queryKey: ["subscription"] })
          } else {
            throw new Error(data?.error || "Failed to upgrade subscription")
          }
        } else {
          // No existing subscription - create new checkout session
          const priceId = getPlanPriceId(newPlanId.toUpperCase() as any, interval)
          if (!priceId) {
            toast.error("Price ID not configured. Please contact support.")
            return
          }

          const { data, error } = await supabase.functions.invoke("create-checkout-session", {
            body: { priceId },
          })

          if (error) throw error

          if (data?.url) {
            window.location.href = data.url
          } else {
            throw new Error("No checkout URL returned")
          }
        }
      } catch (error: any) {
        console.error("Plan change error:", error)
        toast.error(error.message || "Failed to change plan. Please try again.")
      } finally {
        setChangingPlan(false)
      }
    }
  }

  const handleManageSubscription = async () => {
    if (isDemoMode) {
      toast.error("Cannot manage subscription in demo mode")
      return
    }

    setLoadingPortal(true)
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: window.location.origin },
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Subscription & Billing</h2>
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["subscription"] })
                toast.success("Subscription data refreshed!")
              }}
              className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-4">
            {/* Current Plan */}
            <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Plan</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {currentPlan.name}
                    {subscriptionLoading && <span className="text-sm text-gray-500 ml-2">(loading...)</span>}
                  </p>
                  {subscription?.status && subscription.status !== "active" && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      Status: {subscription.status}
                    </span>
                  )}
                  {/* Debug info */}
                  <p className="text-xs text-gray-500 dark:text-gray-600 mt-2">
                    Plan ID: {subscription?.plan_id} → {currentPlanId}
                  </p>
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
                    const planOrder = { FREE: 0, PRO: 1, PLUS: 2, PREMIUM: 3, TEAM: 4, TEAM_PRO: 5, TEAM_BUSINESS: 6 }
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

            {/* Manage Subscription Link */}
            {planIdUpper !== "FREE" && subscription?.stripe_customer_id && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Need to update payment method or cancel?{" "}
                  <button
                    onClick={handleManageSubscription}
                    disabled={loadingPortal}
                    className="text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingPortal ? "Loading..." : "Manage your subscription →"}
                  </button>
                </p>
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

        {/* Newsletter Integrations */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Newsletter Integrations</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Connect your newsletter platform so you can send digest drafts directly from the{" "}
            <a href="/digest" className="text-primary-600 dark:text-primary-400 hover:underline">
              Digest Builder
            </a>
            .
          </p>

          {/* Beehiiv */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-lg">🐝</div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Beehiiv</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{beehiivIntegration ? "Connected" : "Not connected"}</p>
                </div>
              </div>
              {beehiivIntegration && (
                <button
                  onClick={() => disconnectBeehiivMutation.mutate()}
                  disabled={disconnectBeehiivMutation.isPending}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                >
                  Disconnect
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                <input
                  type="password"
                  value={beehiivApiKey}
                  onChange={e => setBeehiivApiKey(e.target.value)}
                  placeholder="your-beehiiv-api-key"
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Found in Beehiiv → Settings → API Keys</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Publication ID</label>
                <input
                  type="text"
                  value={beehiivPublicationId}
                  onChange={e => setBeehiivPublicationId(e.target.value)}
                  placeholder="pub_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Found in your Beehiiv publication URL: beehiiv.com/publications/<strong>pub_...</strong>
                </p>
              </div>
              <button
                onClick={() => saveBeehiivMutation.mutate({ apiKey: beehiivApiKey, publicationId: beehiivPublicationId })}
                disabled={!beehiivApiKey || !beehiivPublicationId || saveBeehiivMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveBeehiivMutation.isPending ? "Saving…" : beehiivIntegration ? "Update Connection" : "Save Connection"}
              </button>
            </div>
          </div>

          {/* MailerLite */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-lg">💚</div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">MailerLite</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{mailerLiteIntegration ? "Connected" : "Not connected"}</p>
                </div>
              </div>
              {mailerLiteIntegration && (
                <button
                  onClick={() => disconnectMailerLiteMutation.mutate()}
                  disabled={disconnectMailerLiteMutation.isPending}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                >
                  Disconnect
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                <input
                  type="password"
                  value={mailerLiteApiKey}
                  onChange={e => setMailerLiteApiKey(e.target.value)}
                  placeholder="your-mailerlite-api-key"
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Found in MailerLite → Integrations → API</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sender Email</label>
                <input
                  type="email"
                  value={mailerLiteFromEmail}
                  onChange={e => setMailerLiteFromEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Must be a verified sender in your MailerLite account</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={mailerLiteFromName}
                  onChange={e => setMailerLiteFromName(e.target.value)}
                  placeholder="Your Name or Newsletter Name"
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={() =>
                  saveMailerLiteMutation.mutate({
                    apiKey: mailerLiteApiKey,
                    fromEmail: mailerLiteFromEmail,
                    fromName: mailerLiteFromName,
                  })
                }
                disabled={!mailerLiteApiKey || !mailerLiteFromEmail || saveMailerLiteMutation.isPending}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveMailerLiteMutation.isPending ? "Saving…" : mailerLiteIntegration ? "Update Connection" : "Save Connection"}
              </button>
            </div>
          </div>
        </div>

        {/* Slack & Discord Integrations — Team plans only */}
        {hasFeature("slackBot") && team && (
          <SlackDiscordSection teamId={team.id} />
        )}

        {/* Digest Quiet Hours */}
        <DigestPreferencesSection />

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

// ── Slack & Discord Integration Section ──────────────────────────────────────

function SlackDiscordSection({ teamId }: { teamId: string }) {
  const queryClient = useQueryClient()

  const { data: slackInstallation } = useQuery({
    queryKey: ["slack-installation", teamId],
    queryFn: async () => {
      if (isDemoMode) return null
      const { data } = await supabase
        .from("slack_installations")
        .select("id, slack_workspace_name, created_at")
        .eq("team_id", teamId)
        .maybeSingle()
      return data as { id: string; slack_workspace_name: string | null; created_at: string } | null
    },
    enabled: !isDemoMode,
  })

  const { data: discordInstallation } = useQuery({
    queryKey: ["discord-installation", teamId],
    queryFn: async () => {
      if (isDemoMode) return null
      const { data } = await supabase
        .from("discord_installations")
        .select("id, guild_name, created_at")
        .eq("team_id", teamId)
        .maybeSingle()
      return data as { id: string; guild_name: string | null; created_at: string } | null
    },
    enabled: !isDemoMode,
  })

  const connectSlack = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error("Not authenticated"); return }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/slack-oauth/install`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ team_id: teamId }),
      })
      const data = await res.json()
      if (data.url) {
        window.open(data.url, "_blank", "width=600,height=700")
      } else {
        toast.error(data.error || "Failed to start Slack connection")
      }
    } catch (err) {
      console.error("[Settings] Slack connect error:", err)
      toast.error("Failed to connect to Slack")
    }
  }

  const disconnectSlackMutation = useMutation({
    mutationFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${supabaseUrl}/functions/v1/slack-oauth`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "disconnect", team_id: teamId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to disconnect")
    },
    onSuccess: () => {
      toast.success("Slack disconnected")
      queryClient.invalidateQueries({ queryKey: ["slack-installation"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const connectDiscord = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error("Not authenticated"); return }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/discord-oauth/install`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ team_id: teamId }),
      })
      const data = await res.json()
      if (data.url) {
        window.open(data.url, "_blank", "width=600,height=700")
      } else {
        toast.error(data.error || "Failed to start Discord connection")
      }
    } catch (err) {
      console.error("[Settings] Discord connect error:", err)
      toast.error("Failed to connect to Discord")
    }
  }

  const disconnectDiscordMutation = useMutation({
    mutationFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${supabaseUrl}/functions/v1/discord-oauth`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session!.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "disconnect", team_id: teamId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed to disconnect")
    },
    onSuccess: () => {
      toast.success("Discord disconnected")
      queryClient.invalidateQueries({ queryKey: ["discord-installation"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Bot Integrations</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Connect Slack or Discord to deliver new articles directly to your team's channels. Use{" "}
        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">/feedvine</code> slash commands to manage subscriptions.
      </p>

      {/* Slack */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Slack</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {slackInstallation ? `Connected to ${slackInstallation.slack_workspace_name || "workspace"}` : "Not connected"}
              </p>
            </div>
          </div>
          {slackInstallation ? (
            <button
              onClick={() => { if (confirm("Disconnect Slack? All channel subscriptions will be removed.")) disconnectSlackMutation.mutate() }}
              disabled={disconnectSlackMutation.isPending}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectSlack}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Connect to Slack
            </button>
          )}
        </div>
        {slackInstallation && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">/feedvine subscribe &lt;feed&gt;</code> in any Slack channel to start receiving articles.
            </p>
          </div>
        )}
      </div>

      {/* Discord */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-lg">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Discord</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {discordInstallation ? `Connected to ${discordInstallation.guild_name || "server"}` : "Not connected"}
              </p>
            </div>
          </div>
          {discordInstallation ? (
            <button
              onClick={() => { if (confirm("Disconnect Discord? All channel subscriptions will be removed.")) disconnectDiscordMutation.mutate() }}
              disabled={disconnectDiscordMutation.isPending}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectDiscord}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Add to Discord
            </button>
          )}
        </div>
        {discordInstallation && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">/feedvine subscribe &lt;feed&gt;</code> in any Discord channel to start receiving articles.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Digest Preferences (Quiet Hours) ────────────────────────────────────────

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
]

function DigestPreferencesSection() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: prefs } = useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user || isDemoMode) return null
      const { data } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle()
      return data
    },
    enabled: !!user && !isDemoMode,
  })

  const [start, setStart] = useState<string>("")
  const [end, setEnd] = useState<string>("")
  const [tz, setTz] = useState("UTC")

  useEffect(() => {
    if (prefs) {
      setStart(prefs.quiet_hours_start !== null ? String(prefs.quiet_hours_start) : "")
      setEnd(prefs.quiet_hours_end !== null ? String(prefs.quiet_hours_end) : "")
      setTz(prefs.quiet_hours_timezone || "UTC")
    }
  }, [prefs])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated")
      const qStart = start !== "" ? Number(start) : null
      const qEnd = end !== "" ? Number(end) : null
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: user.id,
        quiet_hours_start: qStart,
        quiet_hours_end: qEnd,
        quiet_hours_timezone: tz,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] })
      toast.success("Quiet hours saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated")
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: user.id,
        quiet_hours_start: null,
        quiet_hours_end: null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      setStart("")
      setEnd("")
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] })
      toast.success("Quiet hours cleared")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Digest Preferences</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
        Set quiet hours to pause scheduled digests during specific times.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="quiet-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quiet hours start
          </label>
          <select
            id="quiet-start"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-3 text-sm"
          >
            <option value="">Off</option>
            {hours.map(h => (
              <option key={h} value={h}>{`${h.toString().padStart(2, "0")}:00`}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="quiet-end" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quiet hours end
          </label>
          <select
            id="quiet-end"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-3 text-sm"
          >
            <option value="">Off</option>
            {hours.map(h => (
              <option key={h} value={h}>{`${h.toString().padStart(2, "0")}:00`}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="quiet-tz" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Timezone
          </label>
          <select
            id="quiet-tz"
            value={tz}
            onChange={e => setTz(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-3 text-sm"
          >
            {COMMON_TIMEZONES.map(t => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? "Saving..." : "Save Quiet Hours"}
        </button>
        {(start !== "" || end !== "") && (
          <button
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>

      {start !== "" && end !== "" && (
        <p className="mt-3 text-xs text-gray-400">
          Scheduled digests will not be sent between {start.padStart(2, "0")}:00 and {end.padStart(2, "0")}:00 ({tz}).
        </p>
      )}
    </div>
  )
}
