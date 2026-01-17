export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">Last Updated: January 16, 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            By accessing and using RSS Feed Aggregator ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            If you do not agree to these Terms of Service, please do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            RSS Feed Aggregator is a web-based application that allows users to aggregate, organize, and read content from multiple RSS feeds. The
            Service includes features such as:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>RSS feed management and aggregation</li>
            <li>Article reading and tracking</li>
            <li>Content filtering and search</li>
            <li>Article bookmarking and saving</li>
            <li>RSS feed export functionality</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. User Accounts</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            To use certain features of the Service, you must register for an account. You agree to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Maintain the security of your password and account</li>
            <li>Accept all responsibility for all activities that occur under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Subscription Plans</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The Service offers multiple subscription tiers (Free, Pro, Plus, and Premium) with different features and limitations:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>
              <strong>Free Plan:</strong> Limited to 1 RSS feed and 1 category with basic read/unread tracking
            </li>
            <li>
              <strong>Pro Plan:</strong> Up to 5 feeds, 3 categories, 1 feed collection, save articles, and export to RSS ($5/month)
            </li>
            <li>
              <strong>Plus Plan:</strong> Up to 15 feeds, 10 categories, 5 feed collections, advanced filters, and keyboard shortcuts ($10/month)
            </li>
            <li>
              <strong>Premium Plan:</strong> Up to 25 feeds, 25 categories, unlimited collections, API access, and priority support ($15/month)
            </li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Subscription fees are billed in advance on a monthly basis and are non-refundable except as required by law or as explicitly stated in our
            refund policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Payment Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            All payments are processed securely through Stripe. By subscribing to a paid plan, you agree to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Provide current, complete, and accurate billing information</li>
            <li>Authorize us to charge your payment method for all fees incurred</li>
            <li>Pay all charges at the prices in effect when incurred</li>
            <li>Update your payment information promptly if it changes</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We offer a 14-day money-back guarantee for new subscriptions. To request a refund, contact us within 14 days of your initial purchase.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Cancellation and Refunds</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You may cancel your subscription at any time through your account settings or by contacting support. Upon cancellation:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>You will retain access to paid features until the end of your current billing period</li>
            <li>Your account will automatically downgrade to the Free plan</li>
            <li>No refunds will be provided for partial months</li>
            <li>You may resubscribe at any time</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Acceptable Use</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">You agree not to:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Attempt to gain unauthorized access to the Service or related systems</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Use automated means to access the Service without permission</li>
            <li>Resell or redistribute the Service without authorization</li>
            <li>Violate any third-party rights, including copyright or privacy rights</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. Intellectual Property</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The Service and its original content, features, and functionality are owned by RSS Feed Aggregator and are protected by international
            copyright, trademark, and other intellectual property laws.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            RSS feeds and articles accessed through the Service remain the property of their respective owners. We do not claim ownership of any
            third-party content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Limitation of Liability</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            To the maximum extent permitted by law, RSS Feed Aggregator shall not be liable for any indirect, incidental, special, consequential, or
            punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or
            other intangible losses.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Changes to Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service.
            Your continued use of the Service after such modifications constitutes your acceptance of the updated terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Contact Information</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">If you have any questions about these Terms of Service, please contact us at:</p>
          <p className="text-gray-700 dark:text-gray-300">
            Email: support@rssaggregator.com
            <br />
            Address: [Your Business Address]
          </p>
        </section>
      </div>
    </div>
  )
}
