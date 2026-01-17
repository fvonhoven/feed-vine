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
export const PRICING_PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyPriceId: null,
    annualPriceId: null,
    features: {
      maxFeeds: 1,
      maxCategories: 1,
      maxCollections: 0,
      readTracking: true,
      basicFilters: true,
      savedArticles: false,
      advancedFilters: false,
      exportRSS: false,
      keyboardShortcuts: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  PRO: {
    id: "pro",
    name: "Pro",
    monthlyPrice: 6, // Increased from $5 (20% increase)
    annualPrice: 5, // Original price as annual discount
    monthlyPriceId: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: 5,
      maxCategories: 3,
      maxCollections: 1,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: false,
      exportRSS: true,
      keyboardShortcuts: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  PLUS: {
    id: "plus",
    name: "Plus",
    monthlyPrice: 12, // Increased from $10 (20% increase)
    annualPrice: 10, // Original price as annual discount
    monthlyPriceId: import.meta.env.VITE_STRIPE_PLUS_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_PLUS_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: 15,
      maxCategories: 10,
      maxCollections: 5,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: true,
      exportRSS: true,
      keyboardShortcuts: true,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  PREMIUM: {
    id: "premium",
    name: "Premium",
    monthlyPrice: 19, // Increased from $15 (~27% increase)
    annualPrice: 15, // Original price as annual discount
    monthlyPriceId: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    annualPriceId: import.meta.env.VITE_STRIPE_PREMIUM_ANNUAL_PRICE_ID,
    features: {
      maxFeeds: 25,
      maxCategories: 25,
      maxCollections: 25,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: true,
      exportRSS: true,
      keyboardShortcuts: true,
      prioritySupport: false,
      apiAccess: true, // ✅ API access enabled for Premium
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
export function getPlanLimit(userPlan: PlanId, limit: "maxFeeds" | "maxCategories" | "maxCollections"): number {
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
