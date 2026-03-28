import type { Metadata } from 'next';
import Link from 'next/link';
import { Star, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'ReplyWise AI Privacy Policy. Learn how we collect, use, and protect your data.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                Reply<span className="text-blue-600">Wise AI</span>
              </span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Effective Date: March 28, 2026
        </p>

        <div className="mt-10 space-y-10 text-gray-700 leading-relaxed">
          {/* 1 */}
          <section id="introduction">
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="mt-3">
              ReplyWise AI (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website{' '}
              <a href="https://www.replywiseai.com" className="text-blue-600 hover:underline">
                www.replywiseai.com
              </a>{' '}
              and related services (collectively, the &quot;Service&quot;). This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when
              you use our Service. By accessing or using the Service, you agree to the
              terms of this Privacy Policy.
            </p>
          </section>

          {/* 2 */}
          <section id="information-we-collect">
            <h2 className="text-xl font-semibold text-gray-900">2. Information We Collect</h2>

            <h3 className="mt-4 text-lg font-medium text-gray-800">2.1 Information You Provide</h3>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Account information: name, email address, and password (via Supabase authentication with Google OAuth or magic link).</li>
              <li>Business information: business name, Google Business Profile data, store locations, and branding preferences.</li>
              <li>Payment information: billing details processed securely through Stripe. We do not store your full credit card number on our servers.</li>
              <li>Support communications: any messages or files you send to our support team.</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium text-gray-800">2.2 Information Collected Automatically</h3>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Usage data: pages visited, features used, timestamps, and interaction patterns.</li>
              <li>Device and browser information: IP address, browser type, operating system, and device identifiers.</li>
              <li>Cookies and similar technologies: see Section 6 below.</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium text-gray-800">2.3 Information from Third Parties</h3>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Google Business Profile: review data, ratings, and business details accessed through your authorized Google account.</li>
              <li>Authentication providers: profile information from Google OAuth when you sign in.</li>
            </ul>
          </section>

          {/* 3 */}
          <section id="how-we-use-your-information">
            <h2 className="text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
            <p className="mt-3">We use your information to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve the Service, including AI-powered review generation using OpenAI GPT-4o-mini.</li>
              <li>Process transactions and manage your subscription through Stripe.</li>
              <li>Send transactional emails (account verification, billing receipts, review notifications).</li>
              <li>Analyze usage trends to improve our product and user experience.</li>
              <li>Detect and prevent fraud, abuse, or security incidents.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          {/* 4 */}
          <section id="ai-data-processing">
            <h2 className="text-xl font-semibold text-gray-900">4. AI-Powered Data Processing</h2>
            <p className="mt-3">
              Our Service uses OpenAI&apos;s GPT-4o-mini model to generate review drafts and
              reply suggestions. When you use these features, relevant context (such as
              business name, selected tags, and review content) is sent to OpenAI&apos;s API
              for processing. We do not send your personal account credentials to OpenAI.
              OpenAI&apos;s data processing is subject to their own privacy policy and data
              usage terms.
            </p>
          </section>

          {/* 5 */}
          <section id="data-sharing">
            <h2 className="text-xl font-semibold text-gray-900">5. How We Share Your Information</h2>
            <p className="mt-3">We do not sell your personal information. We may share data with:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li><strong>Service providers:</strong> Supabase (database and authentication), Stripe (payments), OpenAI (AI processing), Vercel (hosting), and Google Analytics (if enabled) -- each under agreements to protect your data.</li>
              <li><strong>Legal requirements:</strong> when required by law, court order, or governmental authority.</li>
              <li><strong>Business transfers:</strong> in the event of a merger, acquisition, or sale of assets, your data may be transferred as part of the transaction.</li>
              <li><strong>With your consent:</strong> in any other circumstance where you have given explicit permission.</li>
            </ul>
          </section>

          {/* 6 */}
          <section id="cookies">
            <h2 className="text-xl font-semibold text-gray-900">6. Cookies and Tracking Technologies</h2>
            <p className="mt-3">We use the following types of cookies:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li><strong>Essential cookies:</strong> required for authentication and core functionality (e.g., session tokens).</li>
              <li><strong>Analytics cookies:</strong> Google Analytics (if enabled) to understand how visitors use our site. You can opt out using your browser settings or the Google Analytics opt-out browser extension.</li>
              <li><strong>Preference cookies:</strong> to remember your language and display settings.</li>
            </ul>
            <p className="mt-3">
              You can control cookie preferences through your browser settings. Disabling
              essential cookies may impact Service functionality.
            </p>
          </section>

          {/* 7 */}
          <section id="data-retention">
            <h2 className="text-xl font-semibold text-gray-900">7. Data Retention</h2>
            <p className="mt-3">
              We retain your personal information for as long as your account is active or
              as needed to provide the Service. If you delete your account, we will remove
              your personal data within 30 days, except where retention is required by law
              or for legitimate business purposes (e.g., fraud prevention, legal
              compliance). Aggregated, anonymized data may be retained indefinitely for
              analytics purposes.
            </p>
          </section>

          {/* 8 */}
          <section id="data-security">
            <h2 className="text-xl font-semibold text-gray-900">8. Data Security</h2>
            <p className="mt-3">
              We implement industry-standard security measures including encryption in
              transit (TLS), encryption at rest, row-level security (RLS) in our database,
              and role-based access controls. However, no method of electronic
              transmission or storage is 100% secure. We cannot guarantee absolute
              security of your data.
            </p>
          </section>

          {/* 9 */}
          <section id="your-rights">
            <h2 className="text-xl font-semibold text-gray-900">9. Your Rights</h2>

            <h3 className="mt-4 text-lg font-medium text-gray-800">9.1 General Rights</h3>
            <p className="mt-2">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Access, correct, or delete your personal information.</li>
              <li>Object to or restrict the processing of your data.</li>
              <li>Data portability -- receive your data in a structured, machine-readable format.</li>
              <li>Withdraw consent at any time where processing is based on consent.</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium text-gray-800">9.2 GDPR (European Economic Area)</h3>
            <p className="mt-2">
              If you are located in the EEA, you have additional rights under the General
              Data Protection Regulation (GDPR), including the right to lodge a complaint
              with your local data protection authority. Our legal basis for processing
              personal data includes contract performance, legitimate interests, and
              consent.
            </p>

            <h3 className="mt-4 text-lg font-medium text-gray-800">9.3 CCPA (California)</h3>
            <p className="mt-2">
              If you are a California resident, the California Consumer Privacy Act (CCPA)
              provides you with specific rights regarding your personal information,
              including the right to know what data we collect, the right to delete your
              data, and the right to opt out of the sale of personal information. We do
              not sell personal information.
            </p>

            <h3 className="mt-4 text-lg font-medium text-gray-800">9.4 PIPEDA (Canada)</h3>
            <p className="mt-2">
              If you are a Canadian resident, you have rights under the Personal
              Information Protection and Electronic Documents Act (PIPEDA), including the
              right to access and correct your personal information.
            </p>
          </section>

          {/* 10 */}
          <section id="international-data-transfers">
            <h2 className="text-xl font-semibold text-gray-900">10. International Data Transfers</h2>
            <p className="mt-3">
              Your information may be transferred to and processed in countries other than
              your country of residence, including the United States and Canada, where our
              service providers operate. We ensure appropriate safeguards are in place for
              such transfers in compliance with applicable data protection laws.
            </p>
          </section>

          {/* 11 */}
          <section id="childrens-privacy">
            <h2 className="text-xl font-semibold text-gray-900">11. Children&apos;s Privacy</h2>
            <p className="mt-3">
              Our Service is not directed to individuals under the age of 16. We do not
              knowingly collect personal information from children. If we learn that we
              have collected data from a child under 16, we will delete it promptly.
            </p>
          </section>

          {/* 12 */}
          <section id="changes-to-this-policy">
            <h2 className="text-xl font-semibold text-gray-900">12. Changes to This Privacy Policy</h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. We will notify you of
              material changes by posting the revised policy on our website and updating
              the &quot;Effective Date&quot; above. Your continued use of the Service after changes
              are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* 13 */}
          <section id="contact-us">
            <h2 className="text-xl font-semibold text-gray-900">13. Contact Us</h2>
            <p className="mt-3">
              If you have questions or concerns about this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <p className="mt-2">
              <strong>ReplyWise AI</strong>
              <br />
              Email:{' '}
              <a href="mailto:hello@replywiseai.com" className="text-blue-600 hover:underline">
                hello@replywiseai.com
              </a>
              <br />
              Website:{' '}
              <a href="https://www.replywiseai.com" className="text-blue-600 hover:underline">
                www.replywiseai.com
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} ReplyWise AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
