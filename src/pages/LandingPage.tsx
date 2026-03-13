import { Link } from "react-router-dom"

import { PRICING_PLANS, PLAN_DISPLAY, INDIVIDUAL_PLAN_KEYS, TEAM_PLAN_KEYS, getAnnualSavings, formatPrice } from "../lib/stripe"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-primary-600" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M20 4L4 12L20 20L36 12L20 4Z"
                  fill="currentColor"
                  fillOpacity="0.3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M4 20L20 28L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 28L20 36L36 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-xl font-bold text-gray-900 dark:text-white">FeedVine</span>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
                }}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => {
                  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
                }}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Pricing
              </button>
              <Link to="/auth" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <svg className="w-24 h-24 text-primary-600" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 4L4 12L20 20L36 12L20 4Z"
                fill="currentColor"
                fillOpacity="0.3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M4 20L20 28L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 28L20 36L36 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            <span className="text-primary-600 dark:text-primary-400">FeedVine</span>
            <br />
            The RSS Reader That Does More
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            AI summaries, newsletter auto-drafts to Beehiiv & MailerLite, Slack & Discord bots, team workspaces, public API, and a feed marketplace —
            all in one modern RSS reader.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth"
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started Free
            </Link>
            <button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }}
              className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-lg text-lg font-semibold transition-colors"
            >
              See All Features
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Free forever plan available — no credit card required</p>
        </div>

        {/* Screenshot/Demo */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-purple-400 rounded-2xl blur-3xl opacity-20"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden">
              {/* Replace 'feed-vine-hero.png' with your actual screenshot filename */}
              <img
                src="/feed-vine-hero.png"
                alt="FeedVine RSS Aggregator Dashboard"
                className="w-full h-full object-cover object-top"
                onError={e => {
                  // Fallback to placeholder if image doesn't exist
                  e.currentTarget.style.display = "none"
                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                  if (placeholder) placeholder.style.display = "flex"
                }}
              />
              {/* Placeholder shown if image doesn't exist */}
              <div className="hidden w-full h-full items-center justify-center">
                <div className="text-center">
                  <svg className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">Add your screenshot to /public/feed-vine-hero.png</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">Everything You Need to Own Your Content</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-16 max-w-2xl mx-auto">
          From casual reading to powering your team's newsletter workflow — FeedVine scales with you.
        </p>

        {featureSections.map((section, sIndex) => (
          <div key={sIndex} className="mb-16 last:mb-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{section.icon}</span>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{section.title}</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-10">{section.tier}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.features.map((feature, fIndex) => (
                <div
                  key={fIndex}
                  className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{feature.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{feature.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="bg-gray-50 dark:bg-gray-800/50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-4">Start free, upgrade when you need more</p>
          <p className="text-center text-sm text-green-600 dark:text-green-400 mb-12">💰 Save up to 25% with annual billing</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {INDIVIDUAL_PLAN_KEYS.map(key => {
              const plan = PRICING_PLANS[key]
              const display = PLAN_DISPLAY[key]
              const savings = getAnnualSavings(key)

              return (
                <div
                  key={key}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 flex flex-col transition-all hover:shadow-2xl hover:scale-105 ${
                    display.popular
                      ? "border-primary-500 ring-4 ring-primary-100 dark:ring-primary-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700"
                  }`}
                >
                  {display.popular && <span className="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">POPULAR</span>}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">{plan.name}</h3>
                  <div className="mt-4 mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">${plan.annualPrice}</span>
                      <span className="text-gray-600 dark:text-gray-400">/mo</span>
                    </div>
                    {plan.monthlyPrice > 0 && plan.monthlyPrice !== plan.annualPrice && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-through">${plan.monthlyPrice}/mo</span>
                        <span className="ml-2 text-sm font-semibold text-green-600 dark:text-green-400">Save {savings}%</span>
                      </div>
                    )}
                    {plan.annualPrice > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Billed ${formatPrice(plan.annualPrice * 12)}/year</p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {display.highlights.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="w-5 h-5 text-primary-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={`text-gray-600 dark:text-gray-400 ${feature.includes("Everything in") ? "font-semibold" : ""}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <Link
                      to="/auth"
                      className={`block text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                        display.popular
                          ? "bg-primary-600 hover:bg-primary-700 text-white"
                          : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      }`}
                    >
                      {display.cta}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Team Plans */}
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">🏢 For Teams</h3>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-10">Collaborative workspaces for content teams</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {TEAM_PLAN_KEYS.map(key => {
                const plan = PRICING_PLANS[key]
                const display = PLAN_DISPLAY[key]
                const savings = getAnnualSavings(key)

                return (
                  <div
                    key={key}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 flex flex-col transition-all hover:shadow-2xl hover:scale-105 ${
                      display.popular
                        ? "border-purple-500 ring-4 ring-purple-100 dark:ring-purple-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                    }`}
                  >
                    {display.popular && <span className="bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">MOST POPULAR</span>}
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">{plan.name}</h3>
                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">Up to {plan.features.maxTeamMembers} seats</p>
                    <div className="mt-4 mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">${plan.annualPrice}</span>
                        <span className="text-gray-600 dark:text-gray-400">/mo</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-through">${plan.monthlyPrice}/mo</span>
                        <span className="ml-2 text-sm font-semibold text-green-600 dark:text-green-400">Save {savings}%</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Billed ${formatPrice(plan.annualPrice * 12)}/year</p>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {display.highlights.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <svg className="w-5 h-5 text-purple-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className={`text-gray-600 dark:text-gray-400 ${feature.includes("Everything in") ? "font-semibold" : ""}`}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <Link
                        to="/auth"
                        className="block text-center px-6 py-3 rounded-lg font-semibold transition-colors bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {display.cta}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">Ready to Take Control of Your Content?</h2>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">Start for free — upgrade when you need AI, digests, or team features</p>
        <Link
          to="/auth"
          className="inline-block px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
        >
          Get Started Free
        </Link>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-primary-600" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M20 4L4 12L20 20L36 12L20 4Z"
                    fill="currentColor"
                    fillOpacity="0.3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path d="M4 20L20 28L36 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 28L20 36L36 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">FeedVine</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your RSS feeds, beautifully organized.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Support</h4>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:support@feedvine.app" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">© 2026 Nexus Development, LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const featureSections = [
  {
    icon: "📖",
    title: "Core Reading Experience",
    tier: "Included in every plan, even Free",
    features: [
      { icon: "✓", title: "Read / Unread Tracking", description: "Articles auto-mark as read. Easily filter to see only what's new." },
      { icon: "🔍", title: "Search & Filters", description: "Full-text search, date range, source, and unread-only filters." },
      { icon: "📱", title: "Installable PWA", description: "Add FeedVine to your home screen on any device — works offline too." },
      { icon: "📊", title: "Usage Analytics", description: "Personal reading stats, streak tracking, and feed health dashboard." },
      { icon: "🕐", title: "Reading Time Estimates", description: "See how long each article will take before you dive in." },
      { icon: "🎓", title: "Guided Onboarding", description: "A step-by-step wizard to add your first feeds and create a collection." },
    ],
  },
  {
    icon: "⭐",
    title: "Organize & Share",
    tier: "Starter plan and above",
    features: [
      { icon: "💾", title: "Save for Later", description: "Bookmark articles and find them instantly from your Saved page." },
      { icon: "📂", title: "Collections & Marketplace", description: "Curate public collections and discover feeds shared by others." },
      { icon: "⌨️", title: "Keyboard Shortcuts", description: "Navigate with j/k, mark read with m, save with s — power-user speed." },
      { icon: "📤", title: "OPML Import & Export", description: "Bring your feeds from any reader, or export them to back up." },
    ],
  },
  {
    icon: "🤖",
    title: "AI & Automation",
    tier: "Creator plan and above",
    features: [
      { icon: "🧠", title: "AI Article Summaries", description: "One-click summaries powered by AI so you can scan faster." },
      { icon: "📰", title: "Newsletter Digest Export", description: "Auto-draft digests to Beehiiv or MailerLite in one click." },
      { icon: "⏰", title: "Scheduled Auto-Digests", description: "Set hourly, daily, or weekly schedules and digests draft themselves." },
      { icon: "📜", title: "Digest History", description: "Every digest you send or copy is saved — re-copy or review any time." },
      { icon: "🔕", title: "Quiet Hours", description: "Pause digest delivery overnight or on weekends, per your timezone." },
      { icon: "🔗", title: "Webhooks & Zapier", description: "Push new articles to Zapier, Make, or any HTTP endpoint." },
    ],
  },
  {
    icon: "🛠️",
    title: "Developer & Power User",
    tier: "Builder plan and above",
    features: [
      { icon: "🔌", title: "Public REST API", description: "Programmatic access to feeds, articles, and collections." },
      { icon: "♾️", title: "Unlimited Everything", description: "No caps on feeds, categories, collections, webhooks, or AI summaries." },
      { icon: "🎯", title: "Priority Email Support", description: "Faster response times — your tickets go to the front of the queue." },
    ],
  },
  {
    icon: "👥",
    title: "Team & Enterprise",
    tier: "Team plans only",
    features: [
      { icon: "🏢", title: "Team Workspaces", description: "Invite members, assign admin or member roles, manage from one dashboard." },
      { icon: "📁", title: "Shared Team Collections", description: "Collaborate on curated feed collections across your organization." },
      { icon: "💬", title: "Slack Bot", description: "Get new articles delivered to Slack channels. Subscribe per channel." },
      { icon: "🎮", title: "Discord Bot", description: "Same real-time delivery to Discord servers with /feedvine commands." },
    ],
  },
]

