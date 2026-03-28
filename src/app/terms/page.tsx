import type { Metadata } from 'next';
import Link from 'next/link';
import { Star, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'ReplyWise AI Terms of Service. Read the terms and conditions for using our AI-powered review management platform.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsOfServicePage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Effective Date: March 28, 2026
        </p>

        <div className="mt-10 space-y-10 text-gray-700 leading-relaxed">
          {/* 1 */}
          <section id="acceptance">
            <h2 className="text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By accessing or using the services provided by ReplyWise AI (&quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;) at{' '}
              <a href="https://www.replywiseai.com" className="text-blue-600 hover:underline">
                www.replywiseai.com
              </a>{' '}
              (the &quot;Service&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, you must not use the
              Service.
            </p>
          </section>

          {/* 2 */}
          <section id="service-description">
            <h2 className="text-xl font-semibold text-gray-900">2. Service Description</h2>
            <p className="mt-3">
              ReplyWise AI is an AI-powered Google review management platform designed for
              small and medium-sized businesses. Our Service enables businesses to:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Collect customer reviews via QR codes and customizable flows.</li>
              <li>Generate AI-assisted review drafts using natural language processing.</li>
              <li>Monitor and respond to Google Business Profile reviews.</li>
              <li>Analyze review trends and reputation metrics.</li>
              <li>Manage team access with role-based permissions.</li>
            </ul>
          </section>

          {/* 3 */}
          <section id="accounts">
            <h2 className="text-xl font-semibold text-gray-900">3. Accounts and Registration</h2>
            <p className="mt-3">
              To use certain features of the Service, you must create an account. You
              agree to provide accurate, current, and complete information during
              registration and to keep your account information up to date. You are
              responsible for safeguarding your account credentials and for all activity
              that occurs under your account. You must notify us immediately of any
              unauthorized use.
            </p>
          </section>

          {/* 4 */}
          <section id="acceptable-use">
            <h2 className="text-xl font-semibold text-gray-900">4. Acceptable Use</h2>
            <p className="mt-3">You agree not to:</p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Use the Service to generate fake, misleading, or fraudulent reviews.</li>
              <li>Violate any applicable law, regulation, or third-party rights.</li>
              <li>Post or transmit content that is defamatory, obscene, or harmful.</li>
              <li>Attempt to reverse engineer, decompile, or disassemble the Service.</li>
              <li>Interfere with or disrupt the Service, servers, or networks.</li>
              <li>Use automated tools (bots, scrapers) to access the Service without authorization.</li>
              <li>Impersonate another person or entity.</li>
              <li>Circumvent any rate limits, access controls, or security features.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these
              terms without prior notice.
            </p>
          </section>

          {/* 5 */}
          <section id="ai-generated-content">
            <h2 className="text-xl font-semibold text-gray-900">5. AI-Generated Content</h2>
            <p className="mt-3">
              The Service uses artificial intelligence (OpenAI GPT-4o-mini) to generate
              review drafts and reply suggestions. You acknowledge and agree that:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>
                AI-generated content is provided as a draft or suggestion only. You are
                solely responsible for reviewing, editing, and approving any content
                before it is published.
              </li>
              <li>
                We do not guarantee the accuracy, completeness, or appropriateness of
                AI-generated content.
              </li>
              <li>
                You are responsible for ensuring that any published content complies with
                Google&apos;s review policies and all applicable laws.
              </li>
              <li>
                AI-generated content may not reflect our opinions, endorsements, or
                recommendations.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section id="payment-terms">
            <h2 className="text-xl font-semibold text-gray-900">6. Payment Terms</h2>
            <p className="mt-3">
              Certain features of the Service require a paid subscription. By subscribing
              to a paid plan, you agree to the following:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>All payments are processed securely through Stripe.</li>
              <li>Subscription fees are billed in advance on a monthly or annual basis, depending on your chosen plan.</li>
              <li>Prices are listed in US dollars and are subject to change with 30 days&apos; prior notice.</li>
              <li>You are responsible for any applicable taxes.</li>
              <li>Failed payments may result in suspension of your account until the balance is resolved.</li>
            </ul>
          </section>

          {/* 7 */}
          <section id="cancellation-refunds">
            <h2 className="text-xl font-semibold text-gray-900">7. Cancellation and Refunds</h2>
            <p className="mt-3">
              You may cancel your subscription at any time through your account settings
              or the Stripe customer portal. Upon cancellation:
            </p>
            <ul className="mt-2 list-disc pl-6 space-y-1">
              <li>Your subscription will remain active until the end of the current billing period.</li>
              <li>You will not be charged for subsequent billing periods.</li>
              <li>No prorated refunds are provided for partial billing periods.</li>
              <li>Your data will be retained for 30 days after account closure, after which it will be deleted.</li>
            </ul>
          </section>

          {/* 8 */}
          <section id="intellectual-property">
            <h2 className="text-xl font-semibold text-gray-900">8. Intellectual Property</h2>
            <p className="mt-3">
              All intellectual property rights in the Service, including but not limited
              to software, design, text, graphics, logos, and trademarks, are owned by or
              licensed to ReplyWise AI. You may not copy, modify, distribute, or create
              derivative works based on the Service without our prior written consent.
            </p>
            <p className="mt-3">
              You retain ownership of any content you submit through the Service (such as
              business information and review content). By using the Service, you grant us
              a limited, non-exclusive license to use your content solely for the purpose
              of providing and improving the Service.
            </p>
          </section>

          {/* 9 */}
          <section id="privacy">
            <h2 className="text-xl font-semibold text-gray-900">9. Privacy</h2>
            <p className="mt-3">
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. By using the Service,
              you consent to the data practices described in our Privacy Policy.
            </p>
          </section>

          {/* 10 */}
          <section id="third-party-services">
            <h2 className="text-xl font-semibold text-gray-900">10. Third-Party Services</h2>
            <p className="mt-3">
              The Service integrates with third-party services including Google Business
              Profile, OpenAI, Stripe, and Supabase. Your use of these third-party
              services is subject to their respective terms and privacy policies. We are
              not responsible for the availability, accuracy, or practices of any
              third-party service.
            </p>
          </section>

          {/* 11 */}
          <section id="disclaimer-of-warranties">
            <h2 className="text-xl font-semibold text-gray-900">11. Disclaimer of Warranties</h2>
            <p className="mt-3">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
              ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED,
              ERROR-FREE, OR SECURE, OR THAT ANY DEFECTS WILL BE CORRECTED.
            </p>
          </section>

          {/* 12 */}
          <section id="limitation-of-liability">
            <h2 className="text-xl font-semibold text-gray-900">12. Limitation of Liability</h2>
            <p className="mt-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, REPLYWISE AI AND ITS
              OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
              LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR
              USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING
              NEGLIGENCE), OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE
              POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-3">
              OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO
              THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12)
              MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          {/* 13 */}
          <section id="indemnification">
            <h2 className="text-xl font-semibold text-gray-900">13. Indemnification</h2>
            <p className="mt-3">
              You agree to indemnify, defend, and hold harmless ReplyWise AI, its
              officers, directors, employees, and agents from and against any claims,
              liabilities, damages, losses, and expenses (including reasonable legal fees)
              arising out of or related to your use of the Service, your violation of
              these Terms, or your violation of any third-party rights.
            </p>
          </section>

          {/* 14 */}
          <section id="termination">
            <h2 className="text-xl font-semibold text-gray-900">14. Termination</h2>
            <p className="mt-3">
              We may suspend or terminate your access to the Service at any time, with or
              without cause, and with or without notice. Upon termination, your right to
              use the Service will immediately cease. Sections that by their nature should
              survive termination (including intellectual property, limitation of
              liability, indemnification, and governing law) will survive.
            </p>
          </section>

          {/* 15 */}
          <section id="changes-to-terms">
            <h2 className="text-xl font-semibold text-gray-900">15. Changes to These Terms</h2>
            <p className="mt-3">
              We reserve the right to modify these Terms at any time. We will notify you
              of material changes by posting the revised Terms on our website and updating
              the &quot;Effective Date&quot; above. Your continued use of the Service after changes
              are posted constitutes your acceptance of the updated Terms.
            </p>
          </section>

          {/* 16 */}
          <section id="governing-law">
            <h2 className="text-xl font-semibold text-gray-900">16. Governing Law and Dispute Resolution</h2>
            <p className="mt-3">
              These Terms shall be governed by and construed in accordance with the laws
              of the Province of British Columbia, Canada, without regard to its conflict
              of law provisions. Any disputes arising out of or relating to these Terms or
              the Service shall be resolved exclusively in the courts of British Columbia,
              Canada, and you consent to the personal jurisdiction of such courts.
            </p>
          </section>

          {/* 17 */}
          <section id="severability">
            <h2 className="text-xl font-semibold text-gray-900">17. Severability</h2>
            <p className="mt-3">
              If any provision of these Terms is found to be unenforceable or invalid, that
              provision shall be limited or eliminated to the minimum extent necessary, and
              the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          {/* 18 */}
          <section id="entire-agreement">
            <h2 className="text-xl font-semibold text-gray-900">18. Entire Agreement</h2>
            <p className="mt-3">
              These Terms, together with the Privacy Policy, constitute the entire
              agreement between you and ReplyWise AI regarding the use of the Service and
              supersede all prior agreements, understandings, and communications.
            </p>
          </section>

          {/* 19 */}
          <section id="contact-us">
            <h2 className="text-xl font-semibold text-gray-900">19. Contact Us</h2>
            <p className="mt-3">
              If you have questions about these Terms, please contact us at:
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
