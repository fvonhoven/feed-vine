export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">Last Updated: January 16, 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            FeedVine ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our Service.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            By using the Service, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">2.1 Personal Information</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">When you register for an account, we collect:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Email address</li>
            <li>Password (encrypted)</li>
            <li>Account preferences and settings</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">2.2 Usage Information</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">We automatically collect:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>RSS feeds you subscribe to</li>
            <li>Articles you read, save, or mark as read</li>
            <li>Search queries and filters you use</li>
            <li>Categories and organization preferences</li>
            <li>Usage patterns and feature interactions</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">2.3 Payment Information</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Payment information is processed securely through Stripe. We do not store your full credit card details. Stripe may collect:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Credit card information</li>
            <li>Billing address</li>
            <li>Payment history</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">2.4 Technical Information</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">We collect:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>Operating system</li>
            <li>Referring URLs</li>
            <li>Pages visited and time spent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">We use the collected information to:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Provide, maintain, and improve the Service</li>
            <li>Process your transactions and manage subscriptions</li>
            <li>Send you technical notices, updates, and support messages</li>
            <li>Respond to your comments, questions, and customer service requests</li>
            <li>Monitor and analyze usage patterns and trends</li>
            <li>Detect, prevent, and address technical issues and security threats</li>
            <li>Personalize your experience and deliver relevant content</li>
            <li>Send marketing communications (with your consent)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Sharing and Disclosure</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We do not sell your personal information. We may share your information with the following service providers:
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.1 Service Providers</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We share your information with essential service providers required to operate the Service:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>
              <strong>Supabase</strong> - Database and authentication (your data is stored securely)
            </li>
            <li>
              <strong>Stripe</strong> - Payment processing (we never see your full credit card number)
            </li>
            <li>
              <strong>Netlify</strong> - Hosting infrastructure
            </li>
            <li>
              <strong>Microsoft Clarity</strong> - Privacy-friendly analytics to understand how users interact with the Service (heatmaps, session
              recordings). Clarity does not sell data or use it for advertising. See{" "}
              <a
                href="https://privacy.microsoft.com/en-us/privacystatement"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-500 underline"
              >
                Microsoft's Privacy Statement
              </a>
            </li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            These providers are bound by strict data protection agreements and only process data as necessary to provide their services.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.2 Legal Requirements</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We may disclose your information only if required by law or in response to valid requests by public authorities (e.g., court orders,
            subpoenas).
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.3 Business Transfers</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. You will
            be notified via email of any such change in ownership or control of your personal information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Security</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We implement appropriate technical and organizational measures to protect your personal information, including:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication with Supabase</li>
            <li>Access controls and monitoring</li>
            <li>Secure payment processing through Stripe</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Data Retention and Deletion</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We retain your personal information only for as long as your account is active or as needed to provide services.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">6.1 Account Deletion</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong>You can delete your account and all associated data at any time.</strong> When you delete your account:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>All your personal information is permanently deleted from our database</li>
            <li>Your RSS feed subscriptions, saved articles, and preferences are removed</li>
            <li>Your API keys (if any) are immediately revoked</li>
            <li>This action is irreversible - we cannot recover your data after deletion</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            To delete your account, go to Settings → Account → Delete Account, or contact us at privacy@feedvine.app
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">6.2 Data We Retain After Deletion</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">After account deletion, we may retain minimal information only as required by law:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Payment records (required for tax and accounting purposes, typically 7 years)</li>
            <li>Anonymized usage statistics (no personally identifiable information)</li>
            <li>Records necessary to comply with legal obligations or resolve disputes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Your Privacy Rights</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong>You have complete control over your data.</strong> You have the right to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>
              <strong>Access</strong> - Request a copy of all personal information we have about you
            </li>
            <li>
              <strong>Correct</strong> - Update or correct any inaccurate data in your account settings
            </li>
            <li>
              <strong>Delete</strong> - Permanently delete your account and all associated data at any time
            </li>
            <li>
              <strong>Export</strong> - Download your data in a portable format (JSON, RSS)
            </li>
            <li>
              <strong>Object</strong> - Object to processing of your data for specific purposes
            </li>
            <li>
              <strong>Withdraw consent</strong> - Opt out of marketing communications at any time
            </li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            To exercise these rights, contact us at privacy@feedvine.app. We will respond to your request within 30 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Cookies and Tracking</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong>We use minimal cookies, only for essential functionality.</strong>
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">8.1 Essential Cookies Only</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">We only use cookies that are strictly necessary for the Service to function:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>
              <strong>Authentication</strong> - To keep you logged in (managed by Supabase)
            </li>
            <li>
              <strong>Preferences</strong> - To remember your settings (dark mode, filters, etc.)
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">8.2 Privacy-Friendly Analytics</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We use Microsoft Clarity to understand how users interact with our Service. Clarity uses session storage (not cookies) to collect
            anonymized usage data including:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Page views and navigation patterns</li>
            <li>Click heatmaps and scroll depth</li>
            <li>Session recordings (anonymized)</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong>Important:</strong> Clarity does not sell your data, does not use it for advertising, and does not track you across other
            websites.
          </p>

          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You can instruct your browser to refuse all cookies, but this may prevent you from using certain features of the Service (like staying
            logged in).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Children's Privacy</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you become
            aware that a child has provided us with personal information, please contact us.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. International Data Transfers</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Your information may be transferred to and maintained on servers located outside of your state, province, or country where data protection
            laws may differ. By using the Service, you consent to this transfer.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Changes to Privacy Policy</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and
            updating the "Last Updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Contact Us</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">If you have questions about this Privacy Policy, please contact us:</p>
          <p className="text-gray-700 dark:text-gray-300">Email: privacy@feedvine.app</p>
        </section>
      </div>
    </div>
  )
}
