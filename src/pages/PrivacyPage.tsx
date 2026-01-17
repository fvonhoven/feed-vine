export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">Last Updated: January 16, 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Introduction</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            RSS Feed Aggregator ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our Service.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            By using the Service, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Information We Collect</h2>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">2.1 Personal Information</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            When you register for an account, we collect:
          </p>
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
            Payment information is processed securely through Stripe. We do not store your full credit card details.
            Stripe may collect:
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
            We do not sell your personal information. We may share your information with:
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.1 Service Providers</h3>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Supabase (database and authentication)</li>
            <li>Stripe (payment processing)</li>
            <li>Netlify (hosting)</li>
            <li>Analytics providers</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.2 Legal Requirements</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We may disclose your information if required by law or in response to valid requests by public authorities.
          </p>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-6">4.3 Business Transfers</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If we are involved in a merger, acquisition, or sale of assets, your information may be transferred as part
            of that transaction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Security</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We implement appropriate technical and organizational measures to protect your personal information,
            including:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication with Supabase</li>
            <li>Regular security assessments</li>
            <li>Access controls and monitoring</li>
            <li>Secure payment processing through Stripe</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Data Retention</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We retain your personal information for as long as your account is active or as needed to provide services.
            We will retain and use your information as necessary to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Comply with legal obligations</li>
            <li>Resolve disputes</li>
            <li>Enforce our agreements</li>
            <li>Maintain business records</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Your Rights</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Request data portability</li>
            <li>Withdraw consent at any time</li>
            <li>Opt-out of marketing communications</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            To exercise these rights, please contact us at privacy@rssaggregator.com
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Cookies and Tracking</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We use cookies and similar tracking technologies to track activity on our Service and hold certain
            information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being
            sent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Children's Privacy</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Our Service is not intended for children under 13. We do not knowingly collect personal information from
            children under 13. If you become aware that a child has provided us with personal information, please
            contact us.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. International Data Transfers</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Your information may be transferred to and maintained on servers located outside of your state, province, or
            country where data protection laws may differ. By using the Service, you consent to this transfer.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Changes to Privacy Policy</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
            Privacy Policy on this page and updating the "Last Updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Contact Us</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            If you have questions about this Privacy Policy, please contact us:
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            Email: privacy@rssaggregator.com
            <br />
            Address: [Your Business Address]
          </p>
        </section>
      </div>
    </div>
  )
}

