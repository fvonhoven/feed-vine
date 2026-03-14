import { loadStripe, Stripe } from "@stripe/stripe-js"

// Initialize Stripe
let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      console.warn("Stripe publishable key not found. Stripe features will be disabled.")
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

// Pricing plans configuration
// Internal plan IDs (pro/plus/premium) match database values — display names are shown to users
export const PRICING_PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyPriceId: null,
    annualPriceId: null,
    features: {
      maxFeeds: 5,
      maxCategories: 2,
      maxCollections: 0,
      maxWebhooks: 0,
      maxAiSummaries: 0,
      readTracking: true,
      basicFilters: true,
      savedArticles: false,
      advancedFilters: false,
      exportRSS: false,
      keyboardShortcuts: false,
      articleSearch: false,
      fullTextFetch: false,
      webhooks: false,
      aiSummaries: false,
      newsletterExport: false,
      scheduledDigest: false,
      prioritySupport: false,
      apiAccess: false,
      maxTeamMembers: 0,
      teamWorkspaces: false,
      slackBot: false,
      discordBot: false,
    },
  },
  PRO: {
    id: "pro",
    name: "Starter",
    monthlyPrice: 6,
    annualPrice: 5, // $60/year — 17% savings
    monthlyPriceId: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: 25,
      maxCategories: 10,
      maxCollections: 1,
      maxWebhooks: 0,
      maxAiSummaries: 0,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: false,
      exportRSS: true,
      keyboardShortcuts: true,
      articleSearch: true,
      fullTextFetch: false,
      webhooks: false,
      aiSummaries: false,
      newsletterExport: false,
      scheduledDigest: false,
      prioritySupport: false,
      apiAccess: false,
      maxTeamMembers: 0,
      teamWorkspaces: false,
      slackBot: false,
      discordBot: false,
    },
  },
  PLUS: {
    id: "plus",
    name: "Creator",
    monthlyPrice: 14,
    annualPrice: 11, // $132/year — 21% savings
    monthlyPriceId: import.meta.env.VITE_STRIPE_PLUS_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_PLUS_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: 100,
      maxCategories: 25,
      maxCollections: 5,
      maxWebhooks: 5,
      maxAiSummaries: 200,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: true,
      exportRSS: true,
      keyboardShortcuts: true,
      articleSearch: true,
      fullTextFetch: true,
      webhooks: true,
      aiSummaries: true,
      newsletterExport: true,
      scheduledDigest: true,
      prioritySupport: false,
      apiAccess: false,
      maxTeamMembers: 0,
      teamWorkspaces: false,
      slackBot: false,
      discordBot: false,
    },
  },
  PREMIUM: {
    id: "premium",
    name: "Builder",
    monthlyPrice: 24,
    annualPrice: 19, // $228/year — 21% savings
    monthlyPriceId: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_PREMIUM_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: -1, // -1 = unlimited
      maxCategories: -1,
      maxCollections: -1,
      maxWebhooks: -1,
      maxAiSummaries: -1,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: true,
      exportRSS: true,
      keyboardShortcuts: true,
      articleSearch: true,
      fullTextFetch: true,
      webhooks: true,
      aiSummaries: true,
      newsletterExport: true,
      scheduledDigest: true,
      prioritySupport: true,
      apiAccess: true,
      maxTeamMembers: 0,
      teamWorkspaces: false,
      slackBot: false,
      discordBot: false,
    },
  },
  TEAM: {
    id: "team",
    name: "Team Starter",
    monthlyPrice: 99,
    annualPrice: 69, // $828/year — 30% savings
    monthlyPriceId: import.meta.env.VITE_STRIPE_TEAM_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_TEAM_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: -1,
      maxCategories: -1,
      maxCollections: -1,
      maxWebhooks: -1,
      maxAiSummaries: -1,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: true,
      exportRSS: true,
      keyboardShortcuts: true,
      articleSearch: true,
      fullTextFetch: true,
      webhooks: true,
      aiSummaries: true,
      newsletterExport: true,
      scheduledDigest: true,
      prioritySupport: true,
      apiAccess: true,
      maxTeamMembers: 5,
      teamWorkspaces: true,
      slackBot: true,
      discordBot: true,
    },
  },
  TEAM_PRO: {
    id: "team_pro",
    name: "Team Pro",
    monthlyPrice: 199,
    annualPrice: 149, // $1,788/year — 25% savings
    monthlyPriceId: import.meta.env.VITE_STRIPE_TEAM_PRO_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_TEAM_PRO_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: -1,
      maxCategories: -1,
      maxCollections: -1,
      maxWebhooks: -1,
      maxAiSummaries: -1,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: true,
      exportRSS: true,
      keyboardShortcuts: true,
      articleSearch: true,
      fullTextFetch: true,
      webhooks: true,
      aiSummaries: true,
      newsletterExport: true,
      scheduledDigest: true,
      prioritySupport: true,
      apiAccess: true,
      maxTeamMembers: 15,
      teamWorkspaces: true,
      slackBot: true,
      discordBot: true,
    },
  },
  TEAM_BUSINESS: {
    id: "team_business",
    name: "Team Business",
    monthlyPrice: 329,
    annualPrice: 249, // $2,988/year — 24% savings
    monthlyPriceId: import.meta.env.VITE_STRIPE_TEAM_BUSINESS_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_TEAM_BUSINESS_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: -1,
      maxCategories: -1,
      maxCollections: -1,
      maxWebhooks: -1,
      maxAiSummaries: -1,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: true,
      exportRSS: true,
      keyboardShortcuts: true,
      articleSearch: true,
      fullTextFetch: true,
      webhooks: true,
      aiSummaries: true,
      newsletterExport: true,
      scheduledDigest: true,
      prioritySupport: true,
      apiAccess: true,
      maxTeamMembers: 30,
      teamWorkspaces: true,
      slackBot: true,
      discordBot: true,
    },
  },
} as const

export type PlanId = keyof typeof PRICING_PLANS
export type PlanFeatures = (typeof PRICING_PLANS)[PlanId]["features"]
export type BillingInterval = "monthly" | "annual"

// Helper to check if user has access to a feature
export function hasFeatureAccess(userPlan: PlanId, feature: keyof PlanFeatures): boolean {
  return PRICING_PLANS[userPlan].features[feature] === true
}

// Helper to get plan limits
export function getPlanLimit(
  userPlan: PlanId,
  limit: "maxFeeds" | "maxCategories" | "maxCollections" | "maxWebhooks" | "maxAiSummaries" | "maxTeamMembers",
): number {
  return PRICING_PLANS[userPlan].features[limit]
}

// Helper to get price based on billing interval
export function getPlanPrice(planId: PlanId, interval: BillingInterval): number {
  return interval === "monthly" ? PRICING_PLANS[planId].monthlyPrice : PRICING_PLANS[planId].annualPrice
}

// Helper to get price ID based on billing interval
export function getPlanPriceId(planId: PlanId, interval: BillingInterval): string | null {
  return interval === "monthly" ? PRICING_PLANS[planId].monthlyPriceId : PRICING_PLANS[planId].annualPriceId
}

// Helper to calculate annual savings percentage
export function getAnnualSavings(planId: PlanId): number {
  const plan = PRICING_PLANS[planId]
  if (plan.monthlyPrice === 0) return 0
  const monthlyCost = plan.monthlyPrice * 12
  const annualCost = plan.annualPrice * 12
  return Math.round(((monthlyCost - annualCost) / monthlyCost) * 100)
}

/** Display metadata for pricing cards (landing page + pricing page) */
export const PLAN_DISPLAY = {
  FREE: {
    popular: false,
    cta: "Get Started Free",
    highlights: [
      "5 RSS feeds & 2 categories",
      "Read / unread tracking",
      "Search & basic filters",
      "Usage analytics dashboard",
      "Installable PWA",
    ],
  },
  PRO: {
    popular: false,
    cta: "Start Free Trial",
    highlights: [
      "Everything in Free, plus:",
      "25 feeds & 10 categories",
      "Save articles for later",
      "1 public collection",
      "OPML import & export",
      "Keyboard shortcuts",
      "Full-text article search",
    ],
  },
  PLUS: {
    popular: true,
    cta: "Start Free Trial",
    highlights: [
      "Everything in Starter, plus:",
      "100 feeds & 25 categories",
      "200 AI summaries / mo",
      "Newsletter export (Beehiiv, MailerLite)",
      "Scheduled auto-digests",
      "Digest history & quiet hours",
      "5 webhooks (Zapier / Make)",
      "Advanced keyword filters",
    ],
  },
  PREMIUM: {
    popular: false,
    cta: "Start Free Trial",
    highlights: [
      "Everything in Creator, plus:",
      "Unlimited feeds, categories & collections",
      "Unlimited AI summaries",
      "Unlimited webhooks",
      "Public REST API access",
      "Priority email support",
    ],
  },
  TEAM: {
    popular: false,
    cta: "Start Free Trial",
    highlights: [
      "Everything in Builder, plus:",
      "5-seat team workspace",
      "Admin & member roles",
      "Shared team collections",
      "Slack bot integration",
      "Discord bot integration",
    ],
  },
  TEAM_PRO: {
    popular: true,
    cta: "Start Free Trial",
    highlights: [
      "Everything in Team Starter, plus:",
      "15-seat team workspace",
      "Priority email support",
      "Best value for growing teams",
    ],
  },
  TEAM_BUSINESS: {
    popular: false,
    cta: "Start Free Trial",
    highlights: [
      "Everything in Team Pro, plus:",
      "30-seat team workspace",
      "Lowest per-seat cost",
      "Priority email support",
    ],
  },
} as const

/** Individual plan keys in display order */
export const INDIVIDUAL_PLAN_KEYS: PlanId[] = ["FREE", "PRO", "PLUS", "PREMIUM"]

/** Team plan keys in display order */
export const TEAM_PLAN_KEYS: PlanId[] = ["TEAM", "TEAM_PRO", "TEAM_BUSINESS"]

/** Format a dollar amount with comma separators */
export function formatPrice(amount: number): string {
  return amount.toLocaleString("en-US")
}

// ---------------------------------------------------------------------------
// Subscription status display helpers
// ---------------------------------------------------------------------------

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing"

interface StatusDisplay {
  label: string
  badgeClass: string
  renewalPrefix: string
}

const STATUS_DISPLAY: Record<SubscriptionStatus, StatusDisplay> = {
  active: {
    label: "Active",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    renewalPrefix: "Renews",
  },
  trialing: {
    label: "Free Trial",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    renewalPrefix: "Trial ends",
  },
  past_due: {
    label: "Past Due",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    renewalPrefix: "Payment due",
  },
  canceled: {
    label: "Canceled",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    renewalPrefix: "Access until",
  },
}

/**
 * Get user-friendly display properties for a subscription status
 *
 * @param status - Raw DB subscription status
 * @returns Display label, Tailwind badge classes, and period-end prefix text
 */
export function getStatusDisplay(status: SubscriptionStatus): StatusDisplay {
  return STATUS_DISPLAY[status] ?? STATUS_DISPLAY.active
}

const PLAN_BADGE_COLORS: Record<string, string> = {
  premium: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  plus: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  pro: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  team: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  team_pro: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  team_business: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  free: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
}

/**
 * Get Tailwind badge color classes for a plan
 *
 * @param planId - The raw plan_id from the DB (lowercase)
 */
export function getPlanBadgeColor(planId: string): string {
  return PLAN_BADGE_COLORS[planId] ?? PLAN_BADGE_COLORS.free
}

/**
 * Get the user-facing plan display name
 *
 * @param planId - The raw plan_id from the DB (lowercase)
 */
export function getPlanDisplayName(planId: string): string {
  const upper = planId.toUpperCase() as PlanId
  return PRICING_PLANS[upper]?.name ?? planId.charAt(0).toUpperCase() + planId.slice(1)
}

// Helper to get features as a readable array
export function getPlanFeaturesArray(planId: PlanId): string[] {
  const features = PRICING_PLANS[planId].features
  const featureList: string[] = []

  if (features.maxFeeds === -1) {
    featureList.push("Unlimited feeds")
  } else if (features.maxFeeds > 0) {
    featureList.push(`Up to ${features.maxFeeds} feed${features.maxFeeds > 1 ? "s" : ""}`)
  }
  if (features.maxCategories === -1) {
    featureList.push("Unlimited categories")
  } else if (features.maxCategories > 0) {
    featureList.push(`Up to ${features.maxCategories} categor${features.maxCategories > 1 ? "ies" : "y"}`)
  }
  if (features.maxCollections === -1) {
    featureList.push("Unlimited collections")
  } else if (features.maxCollections > 0) {
    featureList.push(`Up to ${features.maxCollections} collection${features.maxCollections > 1 ? "s" : ""}`)
  }
  if (features.readTracking) {
    featureList.push("Read tracking")
  }
  if (features.savedArticles) {
    featureList.push("Save articles for later")
  }
  if (features.articleSearch) {
    featureList.push("Article search")
  }
  if (features.keyboardShortcuts) {
    featureList.push("Keyboard shortcuts")
  }
  if (features.exportRSS) {
    featureList.push("OPML import & export")
  }
  if (features.fullTextFetch) {
    featureList.push("Full-text article fetch")
  }
  if (features.webhooks) {
    const webhookLabel = features.maxWebhooks === -1 ? "Unlimited webhooks (Zapier/Make)" : `Webhooks – up to ${features.maxWebhooks}`
    featureList.push(webhookLabel)
  }
  if (features.aiSummaries) {
    const aiLabel = features.maxAiSummaries === -1 ? "Unlimited AI summaries" : `AI summaries – ${features.maxAiSummaries}/month`
    featureList.push(aiLabel)
  }
  if (features.newsletterExport) {
    featureList.push("Newsletter export (Beehiiv & MailerLite)")
  }
  if (features.scheduledDigest) {
    featureList.push("Scheduled auto-draft digests")
  }
  if (features.apiAccess) {
    featureList.push("Public REST API access")
  }
  if (features.prioritySupport) {
    featureList.push("Priority support")
  }
  if (features.teamWorkspaces) {
    featureList.push(`Team workspace — up to ${features.maxTeamMembers} seats`)
  }
  if (features.slackBot) {
    featureList.push("Slack bot integration")
  }
  if (features.discordBot) {
    featureList.push("Discord bot integration")
  }

  return featureList
}
