export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Terms of Service</h1>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">Last Updated: January 16, 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            By accessing and using FeedVine ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do
            not agree to these Terms of Service, please do not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. Description of Service</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            FeedVine is a web-based application that allows users to aggregate, organize, and read content from multiple RSS feeds. The Service
            includes features such as:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>RSS feed management and aggregation</li>
            <li>Article reading and tracking</li>
            <li>Content filtering and search</li>
            <li>Article bookmarking and saving</li>
            <li>RSS feed export functionality</li>
            <li>API access for programmatic integration (Premium plan only)</li>
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
              <strong>Pro Plan:</strong> Everything in Free, plus up to 5 feeds, 3 categories, 1 feed collection, save articles, and export to RSS
              ($6/month or $5/month annual)
            </li>
            <li>
              <strong>Plus Plan:</strong> Everything in Pro, plus up to 15 feeds, 10 categories, 5 feed collections, advanced filters, and keyboard
              shortcuts ($12/month or $9/month annual)
            </li>
            <li>
              <strong>Premium Plan:</strong> Everything in Plus, plus up to 25 feeds, 25 categories, 25 collections, and API access with 2,000
              requests/hour ($20/month or $15/month annual)
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
            The Service and its original content, features, and functionality are owned by FeedVine and are protected by international copyright,
            trademark, and other intellectual property laws.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            RSS feeds and articles accessed through the Service remain the property of their respective owners. We do not claim ownership of any
            third-party content.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Disclaimer of Warranties</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
            IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">FeedVine does not warrant that:</p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>The Service will be uninterrupted, secure, or error-free</li>
            <li>Any content from RSS feeds will be accurate, complete, or reliable</li>
            <li>The Service will meet your specific requirements</li>
            <li>Any errors in the Service will be corrected</li>
            <li>RSS feeds will remain available or accessible</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            You acknowledge that RSS feeds are provided by third parties and FeedVine has no control over their content, availability, or accuracy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Limitation of Liability</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL FEEDVINE, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, OR AFFILIATES
            BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED
            DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </p>
          <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4 space-y-2">
            <li>Your access to or use of or inability to access or use the Service</li>
            <li>Any conduct or content of any third party on the Service, including RSS feeds</li>
            <li>Any content obtained from the Service or RSS feeds</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            <li>Any interruption or cessation of the Service</li>
            <li>Any bugs, viruses, or other harmful code that may be transmitted through the Service</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            IN NO EVENT SHALL FEEDVINE'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID FEEDVINE IN THE TWELVE
            (12) MONTHS PRIOR TO THE ACTION GIVING RISE TO LIABILITY, OR (B) ONE HUNDRED DOLLARS ($100).
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Some jurisdictions do not allow the exclusion or limitation of certain warranties or liabilities. In such jurisdictions, the above
            limitations may not apply to you to the extent prohibited by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Changes to Terms</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service.
            Your continued use of the Service after such modifications constitutes your acceptance of the updated terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">12. Contact Information</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">If you have any questions about these Terms of Service, please contact us at:</p>
          <p className="text-gray-700 dark:text-gray-300">Email: support@feedvine.app</p>
        </section>
      </div>
    </div>
  )
}
