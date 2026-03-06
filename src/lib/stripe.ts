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
    annualPrice: 79, // $948/year — 20% savings
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
    annualPrice: 159, // $1,908/year — 20% savings
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
    monthlyPrice: 349,
    annualPrice: 279, // $3,348/year — 20% savings
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
