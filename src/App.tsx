import { Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { useAuth } from "./hooks/useAuth"
import Layout from "./components/Layout"
import HomePage from "./pages/HomePage"
import SavedPage from "./pages/SavedPage"
import DiscoverPage from "./pages/DiscoverPage"
import FeedsPage from "./pages/FeedsPage"
import CollectionsPage from "./pages/CollectionsPage"
import SettingsPage from "./pages/SettingsPage"
import ApiKeysPage from "./pages/ApiKeysPage"
import PricingPage from "./pages/PricingPage"
import TermsPage from "./pages/TermsPage"
import PrivacyPage from "./pages/PrivacyPage"
import AuthPage from "./pages/AuthPage"
import LandingPage from "./pages/LandingPage"

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </>
    )
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/saved" element={<SavedPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/feeds" element={<FeedsPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </>
  )
}

export default App
