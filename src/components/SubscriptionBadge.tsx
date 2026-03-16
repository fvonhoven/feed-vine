import { getStatusDisplay, getPlanBadgeColor, getPlanDisplayName, type SubscriptionStatus } from "../lib/stripe"

interface SubscriptionBadgeProps {
  planId: string
  status: SubscriptionStatus
  periodEnd?: string | null
  cancelAtPeriodEnd?: boolean
  showPlanName?: boolean
  size?: "sm" | "md"
}

/**
 * Reusable subscription badge that shows plan name and/or status.
 * Pulls display logic from the centralized helpers in stripe.ts.
 *
 * @component
 * @param props.planId - Raw plan_id from DB (e.g. "pro", "team_pro")
 * @param props.status - Subscription status from DB
 * @param props.periodEnd - ISO date string for current_period_end
 * @param props.cancelAtPeriodEnd - Whether the subscription cancels at period end
 * @param props.showPlanName - Show plan name badge (default true)
 * @param props.size - Badge size: "sm" for menus, "md" for settings (default "md")
 *
 * @example
 * <SubscriptionBadge planId="pro" status="trialing" periodEnd={subscription.current_period_end} cancelAtPeriodEnd={subscription.cancel_at_period_end} />
 */
export default function SubscriptionBadge({ planId, status, periodEnd, cancelAtPeriodEnd, showPlanName = true, size = "md" }: SubscriptionBadgeProps) {
  const statusDisplay = getStatusDisplay(status)
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2 py-1 text-xs"

  const isCancelling = cancelAtPeriodEnd && status !== "canceled"

  let badgeLabel = statusDisplay.label
  let badgeClass = statusDisplay.badgeClass
  let periodPrefix = statusDisplay.renewalPrefix

  if (isCancelling) {
    badgeLabel = status === "trialing" ? "Trial — Cancels" : "Cancels"
    badgeClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    periodPrefix = "Access until"
  }

  const showStatusBadge = status !== "active" || isCancelling

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showPlanName && (
        <span className={`inline-flex items-center rounded font-medium ${sizeClass} ${getPlanBadgeColor(planId)}`}>
          {getPlanDisplayName(planId)} Plan
        </span>
      )}

      {showStatusBadge && (
        <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${badgeClass}`}>{badgeLabel}</span>
      )}

      {periodEnd && planId !== "free" && (
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {periodPrefix} {new Date(periodEnd).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}
