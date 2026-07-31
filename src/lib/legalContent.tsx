/**
 * Single source of truth for Terms of Service and Privacy Policy content.
 * Rendered by LegalModal (AuthPage signup consent) and by the routed legal
 * pages, which share the LegalDocPage shell.
 *
 * Neither content component renders the "Last updated" line — whoever renders
 * a document owns that, so a page showing two documents prints it once.
 */

export const LEGAL_LAST_UPDATED = 'July 2026';
export const LEGAL_CONTACT_EMAIL = 'synarklabs@gmail.com';

// ─── Shared section component ─────────────────────────────────────────────────

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ title, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      <div className="text-xs leading-relaxed text-foreground/75 space-y-2">{children}</div>
    </section>
  );
}

// ─── Terms of Service ─────────────────────────────────────────────────────────

export function TermsContent() {
  return (
    <div className="space-y-5">
      <LegalSection title="1. Acceptance of Terms">
        <p>
          By accessing or using Hisabify ("the App"), you agree to be bound by these Terms of
          Service. If you do not agree, do not use the App.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <p>
          Hisabify is a personal finance <strong>tracking</strong> tool, not a bank, broker, or
          financial advisor. It helps you track expenses, manage budgets, set savings goals, and
          view financial analytics. The App is provided for personal, non-commercial use only.
        </p>
      </LegalSection>

      <LegalSection title="3. Account Registration & Security">
        <p>
          You must provide accurate information when creating an account. You are responsible
          for maintaining the confidentiality of your credentials and for all activities that
          occur under your account.
        </p>
        <p>
          If you suspect unauthorized access, notify us immediately at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . We will investigate within 24 hours and notify you before taking enforcement action.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Use the App for any unlawful purpose</li>
          <li>Attempt to gain unauthorised access to any part of the App or its infrastructure</li>
          <li>Reverse engineer, decompile, or disassemble the App</li>
          <li>Upload malicious code or interfere with the App's operation</li>
          <li>Impersonate another person or entity</li>
          <li>Spam, scrape, or abuse the App</li>
        </ul>
        <p>
          <strong>Enforcement:</strong> Violations result in a 7-day warning. If you do not cure
          the violation within 7 days, we may suspend or terminate your account. You may appeal
          suspensions by emailing {LEGAL_CONTACT_EMAIL}.
        </p>
      </LegalSection>

      <LegalSection title="5. Financial Data Disclaimer">
        <p>
          <strong>IMPORTANT:</strong> Hisabify is a personal tracking tool and does NOT provide
          financial, investment, tax, or legal advice. Any budgets, analytics, projections, or
          recommendations shown in the App are for personal tracking purposes only and should
          NOT be relied upon for financial decisions.
        </p>
        <p>
          Before making any investment, savings, or financial decisions, consult a qualified
          financial advisor. Hisabify is not responsible for any financial losses or decisions
          made based on the App's data, calculations, or suggestions.
        </p>
      </LegalSection>

      <LegalSection title="6. Limitation of Liability">
        <p>
          To the fullest extent permitted by law, Synark Labs and its officers, directors,
          employees, and agents shall not be liable for:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Indirect, incidental, consequential, special, or punitive damages</li>
          <li>Loss of data, interruptions in service, or app bugs</li>
          <li>Financial losses resulting from use of the App or data loss</li>
          <li>Third-party data breaches or unauthorized access beyond our control</li>
        </ul>
        <p>
          <strong>Liability Cap:</strong> Our total liability to you shall not exceed the amount
          you paid for Hisabify in the past 12 months, or $0 if you use the free tier.
        </p>
        <p>
          <strong>Exception:</strong> This limitation does not apply to data breaches caused by
          our gross negligence or willful misconduct.
        </p>
      </LegalSection>

      <LegalSection title="7. Data & Security">
        <p>
          Your financial data is encrypted in transit using TLS 1.3 and at rest using AES-256
          encryption. We use Supabase as our backend provider, which enforces row-level security
          (RLS) so only you can access your data.
        </p>
        <p>
          We do not sell your personal data to third parties. However, Supabase and other
          third-party services may process your data per their own privacy policies. See our
          Privacy Policy for details.
        </p>
      </LegalSection>

      <LegalSection title="8. Third-Party Services">
        <p>
          Hisabify uses the following third-party services, each governed by their own privacy
          policies:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>Supabase</strong> — database and authentication (supabase.com/privacy)
          </li>
          <li>
            <strong>Google OAuth</strong> — optional sign-in method (google.com/privacy)
          </li>
          <li>
            <strong>Sentry</strong> — optional crash reporting (sentry.io/privacy)
          </li>
          <li>
            <strong>Google Gemini Vision</strong> — receipt image OCR (google.com/privacy)
          </li>
        </ul>
        <p>
          We are not responsible for these third parties' data practices, breaches, or policy
          violations. Contact them directly for privacy concerns about their services.
        </p>
      </LegalSection>

      <LegalSection title="9. Termination">
        <p>
          We reserve the right to suspend or terminate your account at our discretion if you
          violate these Terms of Service. Before termination, we will:
        </p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Send you a warning via email identifying the violation</li>
          <li>Give you 7 days to cure the violation (respond or fix the issue)</li>
          <li>Terminate only if you do not respond within 7 days</li>
        </ol>
        <p>
          <strong>Your Right:</strong> You may request account deletion at any time from Profile
          → Data &amp; Privacy. Requests are reviewed manually; upon approval, all personal data
          is permanently removed within 30 days of your original request, with backup copies
          purged within 90 days.
        </p>
      </LegalSection>

      <LegalSection title="10. Subscription & Billing">
        <p>
          Subscription terms are governed by our separate Subscription & Billing Terms. This
          includes trial periods, refunds, chargebacks, premium credits, and cancellation
          policies. By purchasing a subscription, you agree to those terms.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to Terms">
        <p>
          We may update these Terms of Service at any time. Material changes will be notified
          via in-app notification or email. Continued use of the App after notification
          constitutes acceptance of the revised Terms.
        </p>
        <p>
          If you disagree with updated Terms, you may request data deletion within 30 days of
          the change notification. See our Privacy Policy for the data deletion request
          procedure.
        </p>
      </LegalSection>

      <LegalSection title="12. Dispute Resolution & Jurisdiction">
        <p>
          Any disputes arising from your use of Hisabify shall be resolved through binding
          arbitration in Singapore under the Singapore International Arbitration Centre (SIAC)
          rules. Arbitration shall be conducted in English and is final and binding.
        </p>
        <p>
          <strong>Benefits:</strong> Arbitration is faster and more efficient than court
          litigation. You may still pursue claims in your local jurisdiction if the dispute
          qualifies.
        </p>
        <p>
          Questions about these Terms? Contact us at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </div>
  );
}

// ─── Privacy Policy ───────────────────────────────────────────────────────────

export function PrivacyContent() {
  return (
    <div className="space-y-5">
      <LegalSection title="1. Introduction">
        <p>
          Welcome to Hisabify. We are committed to protecting your privacy and ensuring your
          financial data remains secure and confidential. This Privacy Policy explains how we
          collect, use, and protect your information in compliance with GDPR, APPI, and other
          applicable data protection laws.
        </p>
      </LegalSection>

      <LegalSection title="2. Data Controller & Jurisdiction">
        <p>
          <strong>Company:</strong> Synark Labs Pte. Ltd. (Singapore)
          <br />
          <strong>Email:</strong>{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          <br />
          <strong>Privacy Officer:</strong> To be appointed after incorporation
        </p>
        <p>
          <strong>Applicable Laws:</strong> This Privacy Policy complies with:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>GDPR</strong> (General Data Protection Regulation) for EU/EEA users
          </li>
          <li>
            <strong>APPI</strong> (Act on Protection of Personal Information) for Japan users
          </li>
          <li>Bangladesh data protection regulations for Bangladesh users</li>
        </ul>
        <p>
          We comply with the strictest applicable law in your jurisdiction. If you are in the
          EU, GDPR is your baseline protection.
        </p>
      </LegalSection>

      <LegalSection title="3. Data We Collect">
        <p>
          <strong>A. Account Information (Required):</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Email address</li>
          <li>Full name</li>
          <li>Password (encrypted, never stored in plaintext)</li>
          <li>Phone number (optional)</li>
          <li>Timezone and preferred currency</li>
          <li>Subscription status and premium credit balance</li>
        </ul>

        <p className="pt-2">
          <strong>B. Financial Data (You Enter):</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Transactions (date, amount, merchant, category, notes)</li>
          <li>Cards/accounts (name, type, last 4 digits, balance)</li>
          <li>Budgets (category, period, spending limit)</li>
          <li>Savings goals (name, target amount, deadline, progress)</li>
          <li>Payment reminders (bills, due dates, recurrence)</li>
          <li>Receipt images (uploaded for OCR processing)</li>
          <li>Account deletion request timestamp</li>
        </ul>

        <p className="pt-2">
          <strong>C. Device & Usage Data (Automatically Collected):</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Device type (iOS, Android, web)</li>
          <li>Device OS version and app version</li>
          <li>IP address</li>
          <li>Approximate location (geolocation for currency detection only)</li>
          <li>Feature usage (page views, button clicks, time spent)</li>
          <li>Crash reports and error logs (anonymised, no financial data)</li>
        </ul>

        <p className="pt-2">
          <strong>D. Third-Party Data:</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            Google OAuth: email, name, profile picture (if you sign in with Google)
          </li>
          <li>
            Payment processor: billing address, subscription status, payment method last 4 digits
          </li>
        </ul>

        <p className="pt-2">
          <strong>E. Communication Data:</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Support emails and messages</li>
          <li>In-app feedback, ratings, and bug reports</li>
          <li>Crash reports via Sentry (anonymised)</li>
        </ul>

        <p className="pt-2">
          <strong>Data We Do NOT Collect:</strong> We do not ask for SSN, full credit card
          numbers, or bank account details. You enter transactions, not payment methods, in the
          app.
        </p>
      </LegalSection>

      <LegalSection title="4. Legal Basis for Data Collection">
        <p>
          We collect your data only when we have a valid legal reason (per GDPR Article 6):
        </p>
        <p>
          <strong>Consent:</strong> Financial data (transactions, budgets, goals) — you
          voluntarily enter this. Optional data (phone, profile picture) — you explicitly provide
          this.
        </p>
        <p>
          <strong>Performance of Contract:</strong> Account info (email, password) — needed to
          create your account. Device info — needed to run the app.
        </p>
        <p>
          <strong>Legitimate Interests:</strong> Usage analytics to improve features. Crash
          reports to fix bugs. Security monitoring to detect fraud. Customer support to resolve
          issues.
        </p>
        <p>
          <strong>Legal Obligation:</strong> Compliance with law enforcement requests. Tax and
          accounting records.
        </p>
        <p>
          <strong>Special Processing (Financial Data):</strong> Financial data is "special
          category" data under GDPR. We process it ONLY because you consent by entering it. We do
          NOT profile you or use automated decision-making on financial data.
        </p>
      </LegalSection>

      <LegalSection title="5. How We Use Your Data">
        <p>
          <strong>Provide the App:</strong> Display transactions, calculate analytics, sync
          across devices, process subscription payments, send account-related emails.
        </p>
        <p>
          <strong>Improve the App:</strong> Analyze aggregated, anonymised usage patterns.
          Identify bugs. Track performance metrics. Design new features.
        </p>
        <p>
          <strong>Customer Support:</strong> Respond to your emails and in-app messages.
          Troubleshoot issues. Resolve billing disputes.
        </p>
        <p>
          <strong>Security & Fraud Prevention:</strong> Detect unauthorized account access.
          Monitor for suspicious activity (multiple failed logins, chargebacks). Prevent abuse.
        </p>
        <p>
          <strong>Legal Compliance:</strong> Respond to court orders or law enforcement requests.
          Maintain records for tax/accounting.
        </p>
        <p>
          <strong>Data We Do NOT Use:</strong> We do NOT sell your data, use it for marketing or
          targeted advertising, profile you for financial decisions, or train AI models on your
          data (unless you explicitly opt-in).
        </p>
      </LegalSection>

      <LegalSection title="6. Data Sharing & Third Parties">
        <p>
          <strong>Supabase (Backend Service Provider):</strong> All your financial data, account
          info, and device data. Supabase enforces Row-Level Security (RLS) — only you can access
          your data. Governed by Supabase Privacy Policy. SOC 2 Type II compliant.
        </p>
        <p>
          <strong>Google OAuth:</strong> If you sign in with Google, we receive email, name, and
          profile picture. We do NOT share your transactions or financial data back to Google.
          Governed by Google Privacy Policy.
        </p>
        <p>
          <strong>Sentry (Crash Reporting, Optional):</strong> Crash logs and error reports
          (anonymised — no financial data included). Opt-out in Settings. Governed by Sentry
          Privacy Policy. SOC 2 Type II compliant.
        </p>
        <p>
          <strong>Google Gemini Vision (Receipt OCR):</strong> Receipt images processed
          immediately (not stored by Google). Extracted data (merchant, date, amount) stored in
          Supabase. Images deleted after processing. Governed by Google Cloud Privacy Policy.
        </p>
        <p>
          <strong>Payment Processor (Stripe or similar):</strong> Billing address, subscription
          status, payment method last 4 digits. We never store full credit card numbers. Governed
          by payment processor privacy policy.
        </p>
        <p>
          <strong>Law Enforcement:</strong> Disclosed only if required by law (court order,
          warrant). We notify you unless legally prohibited. Exceptions: emergencies, child
          safety, national security.
        </p>
        <p>
          <strong>Business Transfer:</strong> If Synark Labs is acquired or merges, data may be
          transferred. We notify you and honor your privacy rights.
        </p>
        <p>
          <strong>We Do NOT Sell Data To:</strong> Data brokers, marketing firms, advertisers, or
          other third parties outside the above list.
        </p>
      </LegalSection>

      <LegalSection title="7. International Data Transfers">
        <p>
          Your data is processed in: Supabase servers (US, EU, or Asia-Pacific), Sentry (US), and
          Google (US).
        </p>
        <p>
          <strong>For EU Users (GDPR):</strong> US transfers use Standard Contractual Clauses
          (SCCs). We assess third-party GDPR compliance. You have the right to object to
          international transfers.
        </p>
        <p>
          <strong>For Japan Users (APPI):</strong> Transfers comply with APPI Chapter 4.
          Recipient countries assessed for adequate protection.
        </p>
        <p>
          <strong>For Bangladesh Users:</strong> Data transferred to US/EU servers. We will
          migrate to local storage once Bangladesh Data Protection Act is enacted.
        </p>
      </LegalSection>

      <LegalSection title="8. Your Privacy Rights (GDPR & APPI)">
        <p>
          <strong>Right to Access:</strong> Request a copy of all data we hold about you. Email{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{' '}
          with "Data Access Request". Response: 30 days. Format: CSV, JSON, or summary. Cost: Free.
        </p>
        <p>
          <strong>Right to Rectification:</strong> Correct inaccurate data (wrong email, name).
          Edit in app or email us. Response: 30 days.
        </p>
        <p>
          <strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your
          data or account from Profile → Data &amp; Privacy, or email us with "Erasure Request".
          Requests are reviewed manually rather than actioned instantly; your account remains
          fully usable, and the request cancellable, until then. Response: 30 days. Data
          deleted: within 30 days of your request. Backup copies: purged within 90 days.
          Exceptions: data required by law (tax records).
        </p>
        <p>
          <strong>Right to Data Portability:</strong> Export your data in a portable format. Go
          to Profile → Data &amp; Privacy → Export Data. Formats: CSV, JSON. Cost: Free. Response:
          Immediate (automated export).
        </p>
        <p>
          <strong>Right to Object:</strong> Object to processing for legitimate interests.
          Opt-out of analytics and cookies. Go to Settings → Privacy & Analytics.
        </p>
        <p>
          <strong>Right to Restrict Processing:</strong> Request limitation on data use. Email
          with specific restrictions. We will honor reasonable restrictions.
        </p>
        <p>
          <strong>Right to Lodge a Complaint:</strong> If we violate GDPR or APPI, complain to
          your data protection authority. EU: National data protection authority. Japan: Personal
          Information Protection Commission. Bangladesh: Bangladesh Privacy Commissioner (pending).
        </p>
      </LegalSection>

      <LegalSection title="9. Data Retention">
        <p>
          <strong>Active Accounts:</strong> Financial data retained while account is active.
          Device/usage data: 12 months, then anonymised/deleted. Crash reports: 30 days.
        </p>
        <p>
          <strong>After a Deletion Request is Approved:</strong> Personal data (email, name,
          password): 30 days. Financial data: 30 days. Backup copies: 90 days. Legal/tax
          records: 7 years (legal requirement). Anonymised aggregate data: indefinitely. The
          30/90-day windows are measured from when you submitted the request, not from when it
          was approved.
        </p>
        <p>
          <strong>Special Cases:</strong> Active refund disputes: 180 days (chargeback window).
          Legal investigation: Per law enforcement requirements. Email backups: 12 months.
        </p>
      </LegalSection>

      <LegalSection title="10. Data Security">
        <p>
          <strong>Encryption in Transit:</strong> All data sent between your device and servers
          is encrypted using TLS 1.3. No one can intercept your login or transactions.
        </p>
        <p>
          <strong>Encryption at Rest:</strong> Data stored in Supabase is encrypted using
          AES-256. Database backups are encrypted. Receipt images are encrypted in storage.
        </p>
        <p>
          <strong>Access Control:</strong> Only you can access your data (Row-Level Security).
          Our employees cannot access your financial data without explicit authorization. Access
          logs are audited.
        </p>
        <p>
          <strong>Physical Security:</strong> Supabase data centers have 24/7 security, access
          controls, and surveillance.
        </p>
        <p>
          <strong>Vulnerability Management:</strong> Regular security audits. Automated security
          scanning. OWASP security guidelines. Bug bounty program.
        </p>
        <p>
          <strong>Third-Party Certifications:</strong> Supabase: SOC 2 Type II compliant. Sentry:
          SOC 2 Type II compliant. Google: Certified under multiple standards.
        </p>
        <p>
          <strong>Limitation:</strong> NO security is 100% secure. We are not liable for breaches
          beyond our control (see Terms of Service § 6).
        </p>
      </LegalSection>

      <LegalSection title="11. Cookies & Tracking">
        <p>
          <strong>Essential Cookies (Always Used):</strong> Session cookies (keep you logged in).
          CSRF tokens (prevent cross-site attacks). Preference cookies (remember theme).
        </p>
        <p>
          <strong>Optional Analytics Cookies (Consent-Based):</strong> Google Analytics (page
          views, feature usage, anonymised). Sentry (crash data, anonymised). Opt-out: Settings →
          Privacy & Analytics.
        </p>
        <p>
          <strong>No Advertising Cookies:</strong> We do NOT use cookies for targeted
          advertising or sell data to advertisers.
        </p>
        <p>
          <strong>Do Not Track (DNT):</strong> If your browser has DNT enabled, we respect it
          and will not place optional analytics cookies.
        </p>
      </LegalSection>

      <LegalSection title="12. Children's Privacy (GDPR & COPPA Compliance)">
        <p>
          Hisabify is not intended for users under 18 (or the local age of digital consent). We
          do not knowingly collect data from children. If we discover a child's account, we
          delete it immediately.
        </p>
        <p>
          <strong>EU:</strong> GDPR requires parental consent for children under 16.
        </p>
        <p>
          <strong>US:</strong> COPPA compliance required.
        </p>
        <p>
          If you believe a child has an account, contact us immediately:{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy anytime. Material changes will be notified via
          in-app notification or email. Continued use of the App constitutes acceptance.
        </p>
        <p>
          You have 30 days from notification to request data deletion if you disagree with
          changes.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact & Privacy Officer">
        <p>
          <strong>Privacy Inquiries:</strong> Email{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . Subject: "Privacy Request - [Type]" (e.g., "Privacy Request - Data Access"). Response
          time: 30 business days (GDPR/APPI requirement).
        </p>
        <p>
          <strong>Data Protection Officer:</strong> To be appointed after Singapore incorporation
          and listed here.
        </p>
        <p>
          <strong>EU Representative:</strong> To be appointed if significant EU user base
          develops.
        </p>
      </LegalSection>
    </div>
  );
}
