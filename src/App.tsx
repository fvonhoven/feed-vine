import { useMemo } from "react"
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
import HomePage from "./pages/HomePage"
import SavedPage from "./pages/SavedPage"
import DiscoverPage from "./pages/DiscoverPage"
import FeedsPage from "./pages/FeedsPage"
import FeedArticlesPage from "./pages/FeedArticlesPage"
import CollectionsPage from "./pages/CollectionsPage"
import CollectionArticlesPage from "./pages/CollectionArticlesPage"
import MarketplacePage from "./pages/MarketplacePage"
import ExplorePage from "./pages/ExplorePage"
import SettingsPage from "./pages/SettingsPage"
import ApiKeysPage from "./pages/ApiKeysPage"
import WebhooksPage from "./pages/WebhooksPage"
import DigestPage from "./pages/DigestPage"
import TeamPage from "./pages/TeamPage"
import SearchPage from "./pages/SearchPage"
import PricingPage from "./pages/PricingPage"
import TermsPage from "./pages/TermsPage"
import PrivacyPage from "./pages/PrivacyPage"
import AuthPage from "./pages/AuthPage"
import LandingPage from "./pages/LandingPage"
import PublicCollectionPage from "./pages/PublicCollectionPage"
import OnboardingPage from "./pages/OnboardingPage"
import AnalyticsPage from "./pages/AnalyticsPage"
import InstallPrompt from "./components/InstallPrompt"
import type { User } from "@supabase/supabase-js"

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

  const queryClient = useMemo(
    () => createAppQueryClient(),
    // New client when the signed-in user changes so in-memory cache never leaks across accounts.
    [user?.id ?? "anon"],
  )

  const persister = useMemo(
    () =>
      createSyncStoragePersister({
        storage: window.localStorage,
        key: `feedvine-rq-v1-${user?.id ?? "anon"}`,
      }),
    [user?.id],
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
      key={user?.id ?? "anon"}
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
      <AppRoutes user={user} />
    </PersistQueryClientProvider>
  )
}

export default App
