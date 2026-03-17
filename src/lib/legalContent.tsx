/**
 * Single source of truth for Terms of Service and Privacy Policy content.
 * Used by both the in-app LegalModal (AuthPage) and the full PrivacyPolicyPage.
 */

export const LEGAL_LAST_UPDATED = 'March 2026';
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
          Hisabify is a personal finance management application that helps you track expenses,
          manage budgets, set savings goals, and view financial analytics. The App is provided
          for personal, non-commercial use only.
        </p>
      </LegalSection>

      <LegalSection title="3. Account Registration">
        <p>
          You must provide accurate information when creating an account. You are responsible
          for maintaining the confidentiality of your credentials and for all activities that
          occur under your account. Notify us immediately at {LEGAL_CONTACT_EMAIL} if you
          suspect unauthorised access.
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
        </ul>
      </LegalSection>

      <LegalSection title="5. Financial Data Disclaimer">
        <p>
          Hisabify is a personal tracking tool and does not provide financial advice. Any
          budgets, analytics, or projections shown are for informational purposes only and
          should not be relied upon as professional financial guidance.
        </p>
      </LegalSection>

      <LegalSection title="6. Intellectual Property">
        <p>
          All content, features, and functionality of the App — including but not limited to
          text, graphics, logos, and software — are owned by Synark Labs and protected by
          applicable intellectual property laws.
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          We reserve the right to suspend or terminate your account at our discretion if you
          violate these Terms. You may delete your account at any time from the Profile → Data
          Management section.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of Liability">
        <p>
          To the fullest extent permitted by law, Synark Labs shall not be liable for any
          indirect, incidental, or consequential damages arising from your use of the App.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to Terms">
        <p>
          We may update these Terms at any time. Continued use of the App after changes
          constitutes acceptance of the revised Terms. We will notify you of material changes
          via in-app notification or email.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
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
