import { useQuery } from "@tanstack/react-query"
import { isDemoMode, supabase } from "../lib/supabase"
import { useAuth } from "./useAuth"
import { PRICING_PLANS, getPlanLimit, hasFeatureAccess, type PlanId, type PlanFeatures } from "../lib/stripe"
import type { Subscription } from "../types/database"

export function useSubscription() {
  const { user } = useAuth()

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (isDemoMode || !user) {
        // Return free plan for demo mode
        return {
          id: "demo",
          user_id: user?.id || "demo",
          plan_id: "free" as const,
          status: "active" as const,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Subscription
      }

      // Fetch subscription from database
      const { data, error } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).single()

      if (error) {
        console.error("Error fetching subscription:", error)
        // Return free plan as fallback
        return {
          id: "free-sub",
          user_id: user.id,
          plan_id: "free" as const,
          status: "active" as const,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Subscription
      }

      return data as Subscription
    },
    enabled: !!user,
  })

  const planId = (subscription?.plan_id?.toUpperCase() || "FREE") as PlanId
  const plan = PRICING_PLANS[planId]

  return {
    subscription,
    isLoading,
    planId,
    plan,
    // Helper functions
    hasFeature: (feature: keyof PlanFeatures) => hasFeatureAccess(planId, feature),
    getLimit: (limit: "maxFeeds" | "maxCategories" | "maxCollections") => getPlanLimit(planId, limit),
  }
}
