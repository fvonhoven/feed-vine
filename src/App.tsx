import { lazy, Suspense, useMemo } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { featureFlags } from "./lib/featureFlags"
import { Toaster } from "react-hot-toast"
import { useAuth } from "./hooks/useAuth"
import { createAppQueryClient } from "./lib/queryClient"
import {
  PERSIST_MAX_AGE_MS,
  PERSIST_QUERY_BUSTER,
  shouldPersistArticleRelatedQuery,
} from "./lib/queryPersistence"
import Layout from "./components/Layout"
import InstallPrompt from "./components/InstallPrompt"
import type { User } from "@supabase/supabase-js"

const HomePage = lazy(() => import("./pages/HomePage"))
const SavedPage = lazy(() => import("./pages/SavedPage"))
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"))
const FeedsPage = lazy(() => import("./pages/FeedsPage"))
const FeedArticlesPage = lazy(() => import("./pages/FeedArticlesPage"))
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"))
const CollectionArticlesPage = lazy(() => import("./pages/CollectionArticlesPage"))
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"))
const ExplorePage = lazy(() => import("./pages/ExplorePage"))
const SettingsPage = lazy(() => import("./pages/SettingsPage"))
const ApiKeysPage = lazy(() => import("./pages/ApiKeysPage"))
const WebhooksPage = lazy(() => import("./pages/WebhooksPage"))
const DigestPage = lazy(() => import("./pages/DigestPage"))
const StudioPage = lazy(() => import("./pages/StudioPage"))
const TeamPage = lazy(() => import("./pages/TeamPage"))
const SearchPage = lazy(() => import("./pages/SearchPage"))
const PricingPage = lazy(() => import("./pages/PricingPage"))
const TermsPage = lazy(() => import("./pages/TermsPage"))
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"))
const AuthPage = lazy(() => import("./pages/AuthPage"))
const LandingPage = lazy(() => import("./pages/LandingPage"))
const PublicCollectionPage = lazy(() => import("./pages/PublicCollectionPage"))
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"))
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"))

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading page">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  )
}

function AppRoutes({ user }: { user: User | null }) {
  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/c/:slug" element={<PublicCollectionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </>
    )
  }

  const needsOnboarding = !user.user_metadata?.onboarding_complete

  if (needsOnboarding) {
    return (
      <>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/c/:slug" element={<PublicCollectionPage />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/c/:slug" element={<PublicCollectionPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/feeds" element={<FeedsPage />} />
          <Route path="/feed/:feedId" element={<FeedArticlesPage />} />
          <Route path="/collection/:collectionId" element={<CollectionArticlesPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/digest" element={<DigestPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/team" element={featureFlags.teams ? <TeamPage /> : <Navigate to="/" replace />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
      <InstallPrompt />
    </>
  )
}

function App() {
  const { user, loading } = useAuth()
  const userId = user?.id ?? "anon"

  const queryClient = useMemo(
    () => {
      // Touch the identity so a fresh cache is created for every signed-in user.
      void userId
      return createAppQueryClient()
    },
    // New client when the signed-in user changes so in-memory cache never leaks across accounts.
    [userId],
  )

  const persister = useMemo(
    () =>
      createSyncStoragePersister({
        storage: window.localStorage,
        key: `feedvine-rq-v1-${userId}`,
      }),
    [userId],
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <PersistQueryClientProvider
      key={userId}
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE_MS,
        buster: PERSIST_QUERY_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: query =>
            query.state.status === "success" && shouldPersistArticleRelatedQuery(query),
        },
      }}
    >
      <Suspense fallback={<RouteFallback />}>
        <AppRoutes user={user} />
      </Suspense>
    </PersistQueryClientProvider>
  )
}

export default App
