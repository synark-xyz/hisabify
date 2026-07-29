/**
 * Single source of truth for Terms of Service and Privacy Policy content.
 * Used by both the in-app LegalModal (AuthPage) and the full PrivacyPolicyPage.
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
          <strong>Your Right:</strong> You may delete your account at any time from Profile →
          Data Management. Upon deletion, all personal data is permanently removed within 30
          days.
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
          the change notification. See our Privacy Policy for data deletion procedures.
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

      <p className="text-[10px] text-muted-foreground pt-4 text-center">
        Last updated: {LEGAL_LAST_UPDATED}
      </p>
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
          financial data remains secure. This policy outlines how we collect, use, and protect
          your information.
        </p>
      </LegalSection>

      <LegalSection title="2. Data We Collect">
        <p>We collect only the data necessary to provide our services, including:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Account information (email address, display name)</li>
          <li>Financial data you enter (transactions, budgets, savings goals, payment reminders)</li>
          <li>Device information and usage statistics to improve performance</li>
          <li>Crash reports and error logs (anonymised)</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How We Use Your Data">
        <p>Your data is used to:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Provide and improve the App's features</li>
          <li>Sync your data securely across devices</li>
          <li>Send account-related notifications (password resets, security alerts)</li>
          <li>Analyse aggregate, anonymised usage patterns to guide development</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Data Security">
        <p>
          Your data is encrypted in transit (TLS) and at rest. We use Supabase as our backend
          provider, which enforces row-level security so no user can access another's data.
          We do not sell your personal data to third parties.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-Party Services">
        <p>
          We use the following third-party services, each governed by their own privacy policy:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Supabase — database and authentication</li>
          <li>Google OAuth — optional sign-in method</li>
          <li>Sentry — optional crash reporting</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Access all data stored about you</li>
          <li>Export your data in CSV or JSON format</li>
          <li>Request deletion of your account and all associated data</li>
        </ul>
        <p>
          These actions are available in Profile → Data Management, or by emailing us at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <p>
          We retain your data for as long as your account is active. Upon account deletion,
          all personal data is permanently removed within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of
          significant changes via in-app notification or email. Continued use of the App
          constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact Us">
        <p>
          Questions about this policy? Contact us at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <p className="text-[10px] text-muted-foreground pt-4 text-center">
        Last updated: {LEGAL_LAST_UPDATED}
      </p>
    </div>
  );
}
