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
    price: 0,
    priceId: null,
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
    price: 5,
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
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
    price: 10,
    priceId: import.meta.env.VITE_STRIPE_PLUS_PRICE_ID,
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
    price: 15,
    priceId: import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID,
    features: {
      maxFeeds: 25,
      maxCategories: 25,
      maxCollections: -1,
      readTracking: true,
      basicFilters: true,
      savedArticles: true,
      advancedFilters: true,
      exportRSS: true,
      keyboardShortcuts: true,
      prioritySupport: true,
      apiAccess: true,
    },
  },
} as const

export type PlanId = keyof typeof PRICING_PLANS
export type PlanFeatures = (typeof PRICING_PLANS)[PlanId]["features"]

// Helper to check if user has access to a feature
export function hasFeatureAccess(userPlan: PlanId, feature: keyof PlanFeatures): boolean {
  return PRICING_PLANS[userPlan].features[feature] === true
}

// Helper to get plan limits
export function getPlanLimit(userPlan: PlanId, limit: "maxFeeds" | "maxCategories" | "maxCollections"): number {
  return PRICING_PLANS[userPlan].features[limit]
}
