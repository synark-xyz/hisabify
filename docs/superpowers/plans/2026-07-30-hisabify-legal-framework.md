# Hisabify Legal Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement comprehensive legal framework (T&S, Privacy Policy, Subscription Terms, DPA) with GDPR/APPI compliance, data deletion automation, and pre-launch checklists.

**Architecture:** 
- Expand `legalContent.tsx` with granular sections (T&S, Privacy, Subscription)
- Create new `SubscriptionTermsContent` component for subscription-specific legal terms
- Implement data deletion automation (30-day purge via Supabase RPC)
- Add data export functionality (CSV/JSON via Supabase query)
- Update settings pages with legal links and privacy controls
- Create pre-launch checklists (legal, incorporation, compliance)

**Tech Stack:** React + TypeScript, Supabase (RLS, pg_cron for cleanup), shadcn/ui

## Global Constraints

- **Incorporation:** Synark Labs Pte. Ltd., Singapore (ACRA registration pre-requisite)
- **Jurisdiction:** Singapore (SIAC arbitration venue)
- **Compliance:** GDPR (EU), APPI (Japan), Bangladesh-aware
- **Data Retention:** 30 days post-deletion for all personal data; 7 years for tax records
- **Trial Period:** 7 days free, charge on Day 8
- **Refund Policy:** 7-day full refund, 8-30 days prorated, after 30 days none
- **Premium Credit Expiration:** 12 months (with email reminders at 30 days and 7 days)
- **Fair Process:** 7-day warning before account suspension for T&S violations
- **Third-Party Services:** Supabase (backend), Google OAuth, Sentry (crash), Gemini Vision (OCR)
- **Privacy Officer:** To be appointed after Singapore incorporation

---

## File Structure

### New Files
- `src/lib/legalContent.tsx` (expanded) — Comprehensive T&S, Privacy, Subscription content
- `src/components/SubscriptionTermsContent.tsx` — Standalone subscription terms component
- `src/components/PrivacyControls.tsx` — New Settings component for data controls (export, delete, opt-out)
- `src/pages/SubscriptionTermsPage.tsx` — Full-page subscription terms (similar to PrivacyPolicyPage)
- `src/hooks/useDataManagement.ts` — Hook for data export/delete operations
- `docs/supabase/DPA_Addendum.md` — Data Processing Addendum template
- `docs/legal/PRE_LAUNCH_CHECKLIST.md` — Pre-launch legal checklist (30+ items)
- `docs/legal/INCORPORATION_CHECKLIST.md` — Singapore incorporation checklist

### Modified Files
- `src/pages/PrivacyPolicyPage.tsx` — Update to show new Privacy Policy content
- `src/pages/settings/SettingsPage.tsx` — Add legal links section + privacy controls
- `src/hooks/useAuth.tsx` — Add `accountDeletionInitiated` state (for 30-day purge tracking)
- `src/lib/security.ts` — Add data validation for legal fields (email in privacy requests)

### Supabase Files (Schema Changes)
- `supabase/migrations/20260730_add_account_deletion_tracking.sql` — Track deletion requests
- `supabase/migrations/20260730_add_data_deletion_function.sql` — RPC for 30-day purge
- Update existing RLS policies — Confirm no data exposed beyond user's own records

---

## Task Decomposition

### Task 1: Expand legalContent.tsx with Comprehensive T&S

**Files:**
- Modify: `src/lib/legalContent.tsx`

**Interfaces:**
- Produces: `TermsContent()` component with sections 1-12 (Acceptance, Account, Acceptable Use, Financial Disclaimer, Liability, Data & Security, Third-Party, Termination, Subscription, Changes, Dispute Resolution, Contact)
- Produces: `LEGAL_LAST_UPDATED` constant (updated to 2026-07-30)
- Produces: `LEGAL_CONTACT_EMAIL` constant (synarklabs@gmail.com)

**Steps:**

- [ ] **Step 1: Read current legalContent.tsx to understand structure**

Run: `cat src/lib/legalContent.tsx | head -50`

Expected: See existing TermsContent and PrivacyContent components

- [ ] **Step 2: Backup current file (visual reference)**

The file currently has ~100 lines of basic T&S and Privacy. We'll expand T&S to ~600 lines with all 12 sections from spec.

- [ ] **Step 3: Replace TermsContent() function with comprehensive version**

```typescript
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
```

- [ ] **Step 4: Update LEGAL_LAST_UPDATED constant**

```typescript
export const LEGAL_LAST_UPDATED = 'July 2026';
```

- [ ] **Step 5: Verify component renders (no TypeScript errors)**

Run: `npx tsc --noEmit src/lib/legalContent.tsx`

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/legalContent.tsx
git commit -m "feat: expand Terms of Service with comprehensive 12-section legal framework (fair process, liability caps, financial disclaimer, SIAC arbitration)"
```

---

### Task 2: Expand legalContent.tsx with GDPR/APPI-Compliant Privacy Policy

**Files:**
- Modify: `src/lib/legalContent.tsx` (add to same file)

**Interfaces:**
- Produces: `PrivacyContent()` component with sections 1-14 (Introduction, Data Controller, Data Collection, Legal Basis, Data Usage, Data Sharing, International Transfers, User Rights, Data Retention, Data Security, Cookies, Children's Privacy, Changes, Contact)
- Uses: `LEGAL_LAST_UPDATED`, `LEGAL_CONTACT_EMAIL`

**Steps:**

- [ ] **Step 1: Replace PrivacyContent() function with GDPR/APPI-compliant version**

```typescript
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
          <strong>Right to Access:</strong> Request a copy of all data we hold about you. Email
          synarklabs@gmail.com with "Data Access Request". Response: 30 days. Format: CSV, JSON,
          or summary. Cost: Free.
        </p>
        <p>
          <strong>Right to Rectification:</strong> Correct inaccurate data (wrong email, name).
          Edit in app or email us. Response: 30 days.
        </p>
        <p>
          <strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of your
          account and all data. Go to Settings → Data Management → Delete Account or email
          "Erasure Request". Response: 30 days. Data deleted: Within 30 days. Exceptions: Data
          required by law (tax records).
        </p>
        <p>
          <strong>Right to Data Portability:</strong> Export your data in a portable format. Go
          to Settings → Data Management → Export Data. Formats: CSV, JSON. Cost: Free. Response:
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
          <strong>After Account Deletion:</strong> Personal data (email, name, password): 30
          days. Financial data: 30 days. Backup copies: 90 days. Legal/tax records: 7 years
          (legal requirement). Anonymised aggregate data: Indefinitely.
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

      <p className="text-[10px] text-muted-foreground pt-4 text-center">
        Last updated: {LEGAL_LAST_UPDATED}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit src/lib/legalContent.tsx`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/legalContent.tsx
git commit -m "feat: expand Privacy Policy with GDPR/APPI compliance (14 sections, user rights, data retention, international transfers, cookies)"
```

---

### Task 3: Create SubscriptionTermsContent Component

**Files:**
- Create: `src/components/SubscriptionTermsContent.tsx`

**Interfaces:**
- Produces: `SubscriptionTermsContent()` React component that exports subscription terms
- Uses: `LegalSection` component from legalContent (import)

**Steps:**

- [ ] **Step 1: Create new file with SubscriptionTermsContent component**

```typescript
// src/components/SubscriptionTermsContent.tsx

import { LegalSection } from '@/lib/legalContent';

export function SubscriptionTermsContent() {
  const LEGAL_CONTACT_EMAIL = 'synarklabs@gmail.com';

  return (
    <div className="space-y-5">
      <LegalSection title="1. Subscription Model">
        <p>
          Hisabify offers three options: Free tier (limited features), Premium subscription
          (recurring monthly or yearly), and optional in-app purchases (premium credits).
        </p>
        <p>
          <strong>Auto-Renewal:</strong> Premium subscriptions automatically renew unless you
          cancel. You are responsible for cancellation. Cancellation takes effect at the end of
          your current billing period.
        </p>
      </LegalSection>

      <LegalSection title="2. Free Trial Period">
        <p>
          <strong>Trial Duration:</strong> New premium subscribers receive a 7-day free trial.
        </p>
        <p>
          <strong>Trial Benefits:</strong> All premium features are fully accessible during the
          trial period.
        </p>
        <p>
          <strong>No Payment During Trial:</strong> You will not be charged during the 7-day
          trial.
        </p>
        <p>
          <strong>Automatic Charge:</strong> On Day 8 (at the same time you subscribed), your
          payment method will be automatically charged for the first recurring billing period (30
          or 365 days, depending on your plan choice).
        </p>
        <p>
          <strong>Cancellation Before Trial Ends:</strong> To cancel before trial ends and avoid
          charges, go to Settings → Subscription → Cancel. No questions asked. No charges will
          be applied.
        </p>
        <p>
          <strong>One Trial Per Account:</strong> Trial is available once per account. If you
          cancel and reactivate, the trial will not restart.
        </p>
      </LegalSection>

      <LegalSection title="3. Cancellation & Refund Policy">
        <p>
          <strong>Full Refund (Within 7 Days):</strong> If you request a refund within 7 days of
          purchase, you receive 100% of your payment back, no questions asked.
        </p>
        <p>
          <strong>Partial Refund (Days 8-30):</strong> If you request a refund between days 8
          and 30 after purchase, you receive a prorated refund based on days remaining in your
          billing period.
        </p>
        <p>
          <strong>Example:</strong> If you purchase a $10 monthly subscription on Day 1 and
          request a refund on Day 15, you receive approximately $5 (50% of days remaining: 15 ÷
          30 = 50%).
        </p>
        <p>
          <strong>No Refund (After 30 Days):</strong> Refund requests submitted after 30 days
          from purchase are not eligible for refund. Subscription continues auto-renewing.
        </p>
        <p>
          <strong>Refund Processing Time:</strong> Approved refunds are processed within 5-10
          business days to your original payment method.
        </p>
        <p>
          <strong>Exceptions (No Refund):</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            Premium features substantially used or accessed (e.g., downloaded export files,
            generated reports)
          </li>
          <li>Account deleted by you after subscription purchase</li>
          <li>Account canceled by us due to Terms of Service violations</li>
          <li>In-app purchases (one-time, non-refundable except for defects)</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Billing & Payment">
        <p>
          <strong>Payment Authorization:</strong> By purchasing a subscription, you authorize us
          to charge your payment method for recurring subscription fees.
        </p>
        <p>
          <strong>Billing Cycle:</strong> Subscriptions automatically renew on the anniversary of
          your purchase date each month or year (depending on your plan).
        </p>
        <p>
          <strong>Failed Payments:</strong> If your payment fails:
        </p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>We retry the charge within 5 days (up to 3 attempts)</li>
          <li>If all retries fail, your subscription is suspended until payment succeeds</li>
          <li>You will receive email notifications for each failed attempt</li>
          <li>Premium features become inaccessible when suspended</li>
        </ol>
        <p>
          <strong>Payment Restoration:</strong> Update your payment method in Settings → Billing
          to reactivate your subscription immediately.
        </p>
        <p>
          <strong>Price Changes:</strong> We may change subscription pricing anytime. 30 days'
          notice required before price increases take effect. Continued use after notice
          constitutes acceptance of the new price.
        </p>
        <p>
          <strong>Grandfathering:</strong> Existing subscribers may be grandfathered into the old
          price for their current billing cycle; new subscribers and renewals reflect the new
          price.
        </p>
      </LegalSection>

      <LegalSection title="5. Chargebacks & Disputes (Anti-Fraud)">
        <p>
          <strong>IMPORTANT:</strong> If you dispute a charge with your bank or payment processor
          instead of requesting a refund from us, we consider this a serious breach of trust.
        </p>
        <p>
          <strong>First Chargeback:</strong> Your account will be flagged. We may require
          additional verification or documentation for future purchases.
        </p>
        <p>
          <strong>Second Chargeback:</strong> Your account will be suspended. Future purchases
          will be blocked.
        </p>
        <p>
          <strong>Persistent Chargebacks:</strong> Your account will be terminated permanently.
          All access to Hisabify is revoked.
        </p>
        <p>
          <strong>Why This Policy:</strong> Chargebacks damage our payment processor relationships
          and increase fees for all users. Always contact us first at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{' '}
          before disputing a charge with your bank.
        </p>
        <p>
          <strong>We Want to Help:</strong> If there's a billing issue, we'll resolve it quickly.
          Email us instead of disputing.
        </p>
      </LegalSection>

      <LegalSection title="6. Premium Feature Access Control">
        <p>
          <strong>Active Subscription Required:</strong> Premium features are available only to
          users with active premium subscriptions.
        </p>
        <p>
          <strong>If Subscription Lapses:</strong> When your subscription expires or is canceled:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Premium features become inaccessible</li>
          <li>
            Historical data remains viewable (you don't lose transactions, budgets, or goals)
          </li>
          <li>Premium analytics, reports, and exports require active subscription to download</li>
        </ul>
        <p>
          <strong>Upon Resubscription:</strong> All premium features are immediately restored
          when you renew or purchase a new subscription.
        </p>
      </LegalSection>

      <LegalSection title="7. Account Deletion & Premium Credits">
        <p>
          <strong>Account Deletion:</strong> If you delete your account, all unused premium
          credits are forfeited with no refund.
        </p>
        <p>
          <strong>No Recovery:</strong> Once your account is deleted, credits cannot be
          recovered. Deletion is permanent within 30 days.
        </p>
        <p>
          <strong>Refund + Deletion Sequence:</strong> If you request both a refund AND account
          deletion:
        </p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>We issue the refund first</li>
          <li>Then your account is immediately terminated</li>
          <li>All data is deleted within 30 days</li>
        </ol>
        <p>
          This prevents "refund + keep the data" abuse.
        </p>
      </LegalSection>

      <LegalSection title="8. Premium Credits Policy">
        <p>
          <strong>What Are Credits?</strong> Premium credits are one-time in-app purchases (e.g.,
          "$5 for 500 credits") that unlock premium features and one-time actions.
        </p>
        <p>
          <strong>Purchase & Usage:</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Non-refundable once purchased (except for defects or non-delivery)</li>
          <li>Apply to your account only; cannot transfer or share with other users</li>
          <li>Each feature displays its credit cost before you commit to using it</li>
          <li>Credits deducted immediately upon feature use</li>
          <li>
            Partial usage: If a feature costs 100 credits and you have 150, you'll have 50
            remaining after use
          </li>
        </ul>
        <p>
          <strong>Credit Expiration:</strong>
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong>Expiration Date:</strong> All credits expire 12 months after purchase if
            unused
          </li>
          <li>
            <strong>Definition of "Unused":</strong> Not yet applied to a feature purchase
          </li>
          <li>Expired credits cannot be restored or refunded</li>
          <li>
            We send email reminders 30 days and 7 days before expiration as a courtesy
          </li>
          <li>Accepting reminder emails = acknowledgment of expiration policy</li>
        </ul>
        <p>
          <strong>Refunds for Defects:</strong> If a feature didn't work or credits didn't apply
          correctly, email us within 7 days at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{' '}
          with proof. We'll issue a full refund or credit restoration.
        </p>
        <p>
          <strong>No Refund for Remorse:</strong> If you purchased credits but changed your mind
          before using them, no refund. However, you have 12 months to use them on any premium
          feature.
        </p>
        <p>
          <strong>Feature Deprecation:</strong> If we sunset (discontinue) a premium feature that
          required credits:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>We restore any unused credits for that feature</li>
          <li>
            Restored credits can be used on other premium features (not refunded as cash)
          </li>
          <li>We give 30 days' notice before discontinuing a feature</li>
        </ul>
        <p>
          <strong>Promotional Credits:</strong> Bonus credits from promotions follow the same
          12-month expiration policy. They are:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Non-transferable</li>
          <li>Cannot be cashed out</li>
          <li>Subject to expiration and the same usage rules as purchased credits</li>
          <li>
            Abuse of promotional offers (e.g., creating multiple accounts to farm free credits)
            may result in removal of bonus credits and account suspension
          </li>
        </ul>
        <p>
          <strong>Pricing Changes:</strong> We may change credit pricing anytime. New credit
          pricing takes effect immediately for new purchases. Existing unused credits are honored
          at the old prices you paid.
        </p>
      </LegalSection>

      <LegalSection title="9. In-App Purchases (One-Time Transactions)">
        <p>
          <strong>Definition:</strong> In-app purchases are non-refundable one-time transactions
          (e.g., premium credits, one-time feature unlocks).
        </p>
        <p>
          <strong>Credit Expiration:</strong> Credits purchased expire 12 months after purchase
          if unused.
        </p>
        <p>
          <strong>Non-Transferable:</strong> Credits cannot be transferred to other accounts or
          sold.
        </p>
        <p>
          <strong>Feature Deprecation:</strong> We reserve the right to adjust, deprecate, or
          discontinue premium features at any time. Upon deprecation, unused credits for that
          feature are restored (not refunded as cash).
        </p>
        <p>
          <strong>Non-Refundable Exception:</strong> One-time purchases are non-refundable except
          when a feature is defective or fails to deliver the promised functionality.
        </p>
      </LegalSection>

      <LegalSection title="10. Billing Disputes Process (Fair Process)">
        <p>
          <strong>Step 1: Contact Us</strong>
        </p>
        <p>
          Email{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{' '}
          with "Billing Dispute" in the subject line. Include: your user ID, transaction date,
          the transaction amount, and a brief description of the issue.
        </p>
        <p>
          <strong>Step 2: Initial Response</strong>
        </p>
        <p>
          We will respond within 5 business days with acknowledgment, initial assessment, and
          next steps.
        </p>
        <p>
          <strong>Step 3: Resolution or Explanation</strong>
        </p>
        <p>
          If we agree an error occurred, we issue a refund or credit within 10 business days to
          your original payment method. If we disagree, we provide a detailed explanation with
          evidence supporting our position.
        </p>
        <p>
          <strong>Step 4: Escalation if Unresolved</strong>
        </p>
        <p>
          If the dispute remains unresolved, it proceeds to binding arbitration per our Terms of
          Service § 12 (Singapore International Arbitration Centre rules).
        </p>
      </LegalSection>

      <LegalSection title="11. Contact for Subscription Issues">
        <p>
          For subscription, billing, or refund questions, email{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . Subject line: "Subscription Issue" or "Billing Dispute". Response time: 5 business
          days.
        </p>
      </LegalSection>

      <p className="text-[10px] text-muted-foreground pt-4 text-center">
        Last updated: July 2026
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/components/SubscriptionTermsContent.tsx`

Expected: No errors (will import LegalSection from legalContent)

- [ ] **Step 3: Commit**

```bash
git add src/components/SubscriptionTermsContent.tsx
git commit -m "feat: create SubscriptionTermsContent component (trial, refunds, chargebacks, premium credits, fair process)"
```

---

### Task 4: Create SubscriptionTermsPage

**Files:**
- Create: `src/pages/SubscriptionTermsPage.tsx`

**Interfaces:**
- Produces: Full-page component similar to PrivacyPolicyPage
- Uses: `SubscriptionTermsContent` component, `Header`, `ScrollArea`, `useAuth`

**Steps:**

- [ ] **Step 1: Create SubscriptionTermsPage.tsx**

```typescript
// src/pages/SubscriptionTermsPage.tsx

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionTermsContent } from '@/components/SubscriptionTermsContent';

export function SubscriptionTermsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-page-content">
      <Header
        title={t('page.subscriptionTerms') || 'Subscription Terms'}
        showBack
        onBack={() => navigate(user ? '/settings' : '/auth')}
      />
      <main className="px-4 py-6">
        <ScrollArea className="h-[calc(100vh-140px)] pr-4">
          <SubscriptionTermsContent />
        </ScrollArea>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add i18n key for page title (optional, can use hardcoded fallback)**

If i18n is needed, add to `src/i18n/locales/en/translation.json`:
```json
"page": {
  ...
  "subscriptionTerms": "Subscription Terms"
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit src/pages/SubscriptionTermsPage.tsx`

Expected: No errors

- [ ] **Step 4: Add route to App.tsx**

Edit `src/App.tsx` and add route in protected routes section:
```typescript
<Route path="/subscription-terms" element={<SubscriptionTermsPage />} />
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/SubscriptionTermsPage.tsx src/App.tsx
git commit -m "feat: create SubscriptionTermsPage route (full-page legal view)"
```

---

### Task 5: Create useDataManagement Hook

**Files:**
- Create: `src/hooks/useDataManagement.ts`

**Interfaces:**
- Produces: Hook with methods:
  - `exportData(): Promise<{ csv: string, json: string }>` — Returns CSV and JSON versions of user's data
  - `deleteAccount(): Promise<void>` — Initiates account deletion (marks for 30-day purge)
  - `getDataExportStatus(): Promise<{ lastExported?: Date }>` — Check export history
- Uses: `useAuth()` for user context, Supabase client

**Steps:**

- [ ] **Step 1: Create useDataManagement.ts**

```typescript
// src/hooks/useDataManagement.ts

import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface DataExportResult {
  csv: string;
  json: string;
}

export function useDataManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  const exportData = async (): Promise<DataExportResult> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Fetch all user data from Supabase
      const [
        { data: transactions },
        { data: budgets },
        { data: cards },
        { data: savingsGoals },
        { data: paymentReminders },
      ] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('cards')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('payment_reminders')
          .select('*')
          .eq('user_id', user.id),
      ]);

      // Compile into export object
      const exportObject = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        transactions: transactions || [],
        budgets: budgets || [],
        cards: cards || [],
        savingsGoals: savingsGoals || [],
        paymentReminders: paymentReminders || [],
      };

      // Convert to JSON
      const jsonString = JSON.stringify(exportObject, null, 2);

      // Convert to CSV (simple flat format)
      const csvString = generateCSV(exportObject);

      // Track export (optional, for GDPR logging)
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          action: 'data_export',
          timestamp: new Date().toISOString(),
        })
        .throwOnError();

      toast({
        title: 'Data exported successfully',
        description: 'Your data has been prepared for download.',
      });

      return { csv: csvString, json: jsonString };
    } catch (error) {
      console.error('Data export failed:', error);
      toast({
        title: 'Export failed',
        description: 'Unable to export your data. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Mark account for deletion (30-day grace period)
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      await supabase
        .from('users')
        .update({
          account_deletion_initiated_at: new Date().toISOString(),
          account_deletion_scheduled_for: deletionDate.toISOString(),
        })
        .eq('id', user.id)
        .throwOnError();

      // Log the deletion request (for audit trail)
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          action: 'account_deletion_initiated',
          timestamp: new Date().toISOString(),
        })
        .throwOnError();

      toast({
        title: 'Account deletion initiated',
        description: 'Your account will be permanently deleted in 30 days. You can cancel anytime.',
      });
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast({
        title: 'Deletion failed',
        description: 'Unable to initiate account deletion. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getDataExportStatus = async (): Promise<{ lastExported?: Date }> => {
    if (!user) return {};

    try {
      const { data } = await supabase
        .from('audit_log')
        .select('timestamp')
        .eq('user_id', user.id)
        .eq('action', 'data_export')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      return {
        lastExported: data?.timestamp ? new Date(data.timestamp) : undefined,
      };
    } catch (error) {
      console.error('Failed to fetch export status:', error);
      return {};
    }
  };

  return {
    exportData,
    deleteAccount,
    getDataExportStatus,
  };
}

// Helper: Convert export object to CSV
function generateCSV(exportObject: any): string {
  let csv = 'Hisabify Data Export\n';
  csv += `Export Date: ${exportObject.exportDate}\n`;
  csv += `User Email: ${exportObject.userEmail}\n\n`;

  // Transactions section
  csv += 'TRANSACTIONS\n';
  csv +=
    'Date,Merchant,Amount,Category,Notes\n';
  exportObject.transactions.forEach((t: any) => {
    csv += `${t.date},"${t.merchant}",${t.amount},"${t.category}","${t.notes || ''}"\n`;
  });

  csv += '\n\nBUDGETS\n';
  csv += 'Category,Period,Limit\n';
  exportObject.budgets.forEach((b: any) => {
    csv += `"${b.category}","${b.period}",${b.limit}\n`;
  });

  csv += '\n\nCARDS\n';
  csv += 'Name,Type,Last4,Balance\n';
  exportObject.cards.forEach((c: any) => {
    csv += `"${c.name}","${c.type}",${c.last4},${c.balance}\n`;
  });

  csv += '\n\nSAVINGS GOALS\n';
  csv += 'Name,Target,Deadline,Progress\n';
  exportObject.savingsGoals.forEach((s: any) => {
    csv += `"${s.name}",${s.target},"${s.deadline}",${s.progress}\n`;
  });

  return csv;
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit src/hooks/useDataManagement.ts`

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useDataManagement.ts
git commit -m "feat: create useDataManagement hook (export data as CSV/JSON, initiate account deletion)"
```

---

### Task 6: Update Settings Pages with Legal Links & Privacy Controls

**Files:**
- Modify: `src/pages/settings/SettingsPage.tsx`
- Create: `src/components/PrivacyControls.tsx`

**Interfaces:**
- Produces: PrivacyControls component with buttons for:
  - Export Data (download CSV/JSON)
  - Delete Account (initiate 30-day deletion)
  - Opt-out of Analytics
- Uses: `useDataManagement` hook

**Steps:**

- [ ] **Step 1: Create PrivacyControls.tsx component**

```typescript
// src/components/PrivacyControls.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDataManagement } from '@/hooks/useDataManagement';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function PrivacyControls() {
  const { exportData, deleteAccount } = useDataManagement();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExportData = async () => {
    setLoading(true);
    try {
      const { csv, json } = await exportData();

      // Download CSV
      const csvBlob = new Blob([csv], { type: 'text/csv' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement('a');
      csvLink.href = csvUrl;
      csvLink.download = `hisabify-export-${new Date().toISOString().split('T')[0]}.csv`;
      csvLink.click();

      // Also make JSON available
      const jsonBlob = new Blob([json], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `hisabify-export-${new Date().toISOString().split('T')[0]}.json`;
      jsonLink.click();

      toast({
        title: 'Data exported',
        description: 'Your data has been downloaded as CSV and JSON files.',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: 'Unable to export your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteAccount();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div>
        <h3 className="font-semibold mb-2">Data & Privacy</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Manage your data, export, or request account deletion per GDPR/APPI.
        </p>
      </div>

      {/* Export Data */}
      <Button
        variant="outline"
        onClick={handleExportData}
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Exporting...' : 'Export My Data'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Download your transactions, budgets, and goals as CSV and JSON files.
      </p>

      {/* Delete Account */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            Delete Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete your account and all associated data within 30 days. You
            can cancel anytime during this period.
            <br />
            <br />
            <strong>Please note:</strong>
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>All transactions, budgets, and goals will be deleted</li>
              <li>You will lose access to premium features immediately</li>
              <li>We will process refunds for your remaining subscription (if applicable)</li>
              <li>Data is completely removed within 30 days</li>
            </ul>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-xs text-muted-foreground">
        Request permanent account deletion. Processing takes up to 30 days.
      </p>

      {/* Analytics Opt-Out */}
      <div className="border-t pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            defaultChecked={!localStorage.getItem('analytics_opted_out')}
            onChange={(e) => {
              if (!e.target.checked) {
                localStorage.setItem('analytics_opted_out', 'true');
                toast({
                  title: 'Analytics disabled',
                  description: 'We will not track your app usage.',
                });
              } else {
                localStorage.removeItem('analytics_opted_out');
                toast({
                  title: 'Analytics enabled',
                  description: 'We will track anonymised app usage to improve features.',
                });
              }
            }}
          />
          <span className="text-sm">Enable anonymous usage analytics</span>
        </label>
        <p className="text-xs text-muted-foreground mt-2">
          Help us improve by sharing anonymised usage data (no personal info or financial data
          included).
        </p>
      </div>

      {/* Legal Links */}
      <div className="border-t pt-4 space-y-2">
        <p className="text-xs font-semibold">Legal Documents</p>
        <div className="flex flex-col gap-2">
          <a href="/privacy-policy" className="text-xs text-blue-500 hover:underline">
            Privacy Policy
          </a>
          <a href="/terms" className="text-xs text-blue-500 hover:underline">
            Terms of Service
          </a>
          <a href="/subscription-terms" className="text-xs text-blue-500 hover:underline">
            Subscription Terms
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add PrivacyControls to SettingsPage.tsx**

Edit `src/pages/settings/SettingsPage.tsx` and add in the settings panel:

```typescript
import { PrivacyControls } from '@/components/PrivacyControls';

// Inside the settings page component, add:
<section className="space-y-4">
  <h2 className="text-lg font-semibold">Privacy & Data Management</h2>
  <PrivacyControls />
</section>
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit src/components/PrivacyControls.tsx src/pages/settings/SettingsPage.tsx`

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/PrivacyControls.tsx src/pages/settings/SettingsPage.tsx
git commit -m "feat: add PrivacyControls component to settings (export, delete, analytics opt-out, legal links)"
```

---

### Task 7: Create Supabase Migrations for Account Deletion Tracking

**Files:**
- Create: `supabase/migrations/20260730_add_account_deletion_tracking.sql`

**Interfaces:**
- Produces: Columns on `users` table:
  - `account_deletion_initiated_at: timestamp`
  - `account_deletion_scheduled_for: timestamp`

**Steps:**

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260730_add_account_deletion_tracking.sql

-- Add account deletion tracking columns to users table
ALTER TABLE public.users
ADD COLUMN account_deletion_initiated_at TIMESTAMP,
ADD COLUMN account_deletion_scheduled_for TIMESTAMP;

-- Index for scheduled deletion processing
CREATE INDEX idx_users_account_deletion_scheduled_for
ON public.users (account_deletion_scheduled_for)
WHERE account_deletion_scheduled_for IS NOT NULL;

-- Update RLS policy to prevent access to accounts marked for deletion
-- (Users can still access their own data during 30-day grace period)
CREATE POLICY "Allow access to own data until deletion is complete"
ON public.users
FOR SELECT
USING (auth.uid() = id AND account_deletion_scheduled_for > now());
```

- [ ] **Step 2: Create pg_cron job for automatic deletion (optional, done separately)**

This creates a cron job to process deletions after 30 days. Can be added in a separate migration.

- [ ] **Step 3: Test migration locally**

Run: `supabase migration list`

Expected: New migration appears in list

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260730_add_account_deletion_tracking.sql
git commit -m "feat: add account_deletion columns to users table (30-day grace period tracking)"
```

---

### Task 8: Create Pre-Launch Legal Checklist

**Files:**
- Create: `docs/legal/PRE_LAUNCH_CHECKLIST.md`

**Steps:**

- [ ] **Step 1: Create checklist file**

```markdown
# Hisabify Pre-Launch Legal Checklist

> **Status:** Version 1.0 (2026-07-30)  
> **Owner:** Legal Team  
> **Last Updated:** 2026-07-30

This checklist ensures all legal requirements are met before public launch.

---

## Incorporation & Company Structure

- [ ] Synark Labs Pte. Ltd. registered with ACRA (Singapore)
- [ ] Singapore business bank account opened
- [ ] GST registration (if applicable)
- [ ] Privacy Officer appointed
- [ ] Data Protection Officer designated (for GDPR compliance)
- [ ] EU Representative appointed (if EU users > 1000)

---

## Legal Documents Completed

- [ ] **Terms of Service** — 12 sections, SIAC arbitration, fair process, liability caps
- [ ] **Privacy Policy** — 14 sections, GDPR/APPI compliant, user rights explained
- [ ] **Subscription & Billing Terms** — 11 sections, refund policy, trial, premium credits
- [ ] **Data Processing Addendum (DPA)** — Signed with Supabase
- [ ] In-app legal links updated (Privacy, T&S, Subscription Terms)
- [ ] Last-updated dates stamped on all legal documents

---

## Technical Implementation

### Data Management
- [ ] Data export functionality implemented (CSV/JSON)
- [ ] Account deletion (30-day purge) implemented
- [ ] Supabase migration: `account_deletion_tracking` applied
- [ ] Supabase migration: `account_deletion_function` applied (RPC for purge)
- [ ] 30-day deletion RLS policy verified (automatic cleanup)
- [ ] Data export tested end-to-end

### Privacy Controls
- [ ] PrivacyControls component created and integrated in Settings
- [ ] Analytics opt-out toggle working (localStorage-based)
- [ ] "Do Not Track" browser signal respected (verified in code)
- [ ] Sentry crash reporting opt-out working (Settings → Privacy)

### Legal Page Links
- [ ] `/privacy-policy` route renders full Privacy Policy
- [ ] `/terms` route renders full Terms of Service
- [ ] `/subscription-terms` route renders Subscription Terms
- [ ] In-app Settings → Legal section links all three documents
- [ ] Footer displays "Last updated: [DATE]" on all legal pages

### Third-Party Compliance
- [ ] Supabase DPA signed and archived
- [ ] Supabase SOC 2 Type II certification verified
- [ ] Google OAuth privacy policy reviewed
- [ ] Sentry privacy policy reviewed
- [ ] Gemini Vision API privacy policy reviewed
- [ ] Sub-processor list (Supabase SLAs) documented

---

## Data Security & Encryption

- [ ] TLS 1.3 enforced for all client-server communication (verified via SSL labs)
- [ ] AES-256 encryption at rest confirmed (Supabase docs)
- [ ] Supabase Row-Level Security (RLS) policies verified on all tables
- [ ] No hardcoded secrets in client code (audit via grep)
- [ ] API keys properly scoped (anon key read-only where possible)
- [ ] Database credentials never exposed to frontend

---

## GDPR Compliance (If EU Users Present)

- [ ] Legal basis documented for each data collection (T&S § 4)
- [ ] User rights fully implemented (access, export, delete, portability, objection)
- [ ] 30-day data deletion SLA confirmed (post-account-deletion)
- [ ] Data Processing Addendum with Supabase signed
- [ ] Lawful basis for international data transfers documented (SCCs)
- [ ] GDPR privacy request process documented (30-day response SLA)
- [ ] Incident response plan for data breaches in place

---

## APPI Compliance (Japan Users)

- [ ] Privacy Policy complies with APPI chapters 1-4
- [ ] Data collection legal basis documented (consent, contract, legitimate interest)
- [ ] User rights aligned with APPI (access, correction, erasure)
- [ ] International transfer notification (US/EU server disclosure)
- [ ] APPI-compliant privacy request process (30-day response)

---

## Bangladesh Compliance (User Base)

- [ ] Privacy Policy acknowledges Bangladesh data considerations
- [ ] No requirement to store data in Bangladesh (not legally mandated yet)
- [ ] Plan to migrate to Bangladesh servers once national law enacted
- [ ] Data transfer to US/EU servers disclosed to Bangladesh users

---

## Payment & Billing

- [ ] Subscription model clearly explained (auto-renewal, cancellation)
- [ ] 7-day free trial terms in app and legal docs
- [ ] Refund policy: 7-day full, 8-30 days prorated, after 30 none
- [ ] Refund processing pipeline tested (payment processor integration)
- [ ] Failed payment retry logic tested (3 retries over 5 days)
- [ ] Premium credit expiration (12 months) implemented
- [ ] Credit expiration reminders sent at 30 and 7 days before expiration
- [ ] Chargeback policy clearly stated and enforced
- [ ] Subscription cancellation flow tested end-to-end

---

## Testing & Validation

### Account Deletion
- [ ] Test: Create account → Request deletion → Verify marked for deletion → Wait 30 days → Verify complete deletion
- [ ] Test: Deletion can be canceled during 30-day window
- [ ] Test: Deleted account data not recoverable (soft delete then hard delete after 30d)
- [ ] Test: Backup copies also deleted within 90 days

### Data Export
- [ ] Test: Export data → Receive CSV file
- [ ] Test: Export data → Receive JSON file
- [ ] Test: Exported data matches current app state (all transactions present)
- [ ] Test: Sensitive data (passwords) not included in export

### Privacy Controls
- [ ] Test: Opt-out of analytics → Verify localStorage set → Analytics not sent
- [ ] Test: Opt-in to analytics → Verify localStorage cleared → Analytics sent
- [ ] Test: "Do Not Track" browser flag → Verify analytics not sent
- [ ] Test: Delete account → Verify confirmation dialog → Verify processing initiates

### Privacy Requests
- [ ] Test: Send "Data Access" request → Verify response within 30 days
- [ ] Test: Send "Erasure" request → Verify response within 30 days
- [ ] Test: Send "Rectification" request → Verify response within 30 days

### Legal Documents Display
- [ ] Test: Load Privacy Policy page → Verify no broken links
- [ ] Test: Load Terms page → Verify no broken links
- [ ] Test: Load Subscription Terms page → Verify no broken links
- [ ] Test: All last-updated dates match spec (July 2026)

---

## Security Audit

- [ ] Code audit: No secrets in environment (grep for API keys)
- [ ] Code audit: No hardcoded email addresses (except legal contact)
- [ ] Code audit: Input validation on privacy request forms
- [ ] Dependency audit: Check for known vulnerabilities (npm audit)
- [ ] OWASP Top 10 review: XSS, CSRF, SQL injection, auth flaws

---

## Documentation

- [ ] Legal spec documented: `docs/superpowers/specs/2026-07-30-hisabify-legal-framework.md`
- [ ] Implementation plan documented: `docs/superpowers/plans/2026-07-30-hisabify-legal-framework.md`
- [ ] Data retention schedule documented (7 years tax, 30 days personal, 12 months usage)
- [ ] Privacy officer email established (synarklabs@gmail.com)
- [ ] Support response SLA documented (5 business days)
- [ ] Incident response plan documented (breach notification, authorities, users)

---

## Team Alignment

- [ ] Product team briefed on GDPR/APPI obligations
- [ ] Support team knows privacy request process (30-day SLA)
- [ ] Engineering team knows deletion timeline (30-day grace period)
- [ ] Finance team knows refund policy and processing timelines
- [ ] All team members signed data protection addendum (if required by jurisdiction)

---

## Final Sign-Offs

- [ ] Legal review completed (internal or external counsel)
- [ ] Privacy officer approval obtained
- [ ] Product lead sign-off on user-facing changes
- [ ] Ops lead sign-off on data retention/deletion timelines
- [ ] Security lead sign-off on encryption and access controls

---

## Post-Launch (First 30 Days)

- [ ] Monitor support email for privacy requests (should be minimal)
- [ ] Verify 30-day deletion job runs on schedule (check Supabase logs)
- [ ] Test privacy request response (send yourself a request, track response time)
- [ ] Monitor analytics opt-out rate (expect 5-10% initially)
- [ ] Check error logs for data export failures (should be none)

---

**Checklist Version:** 1.0  
**Last Reviewed:** 2026-07-30  
**Next Review:** 2026-10-30 (quarterly)
```

- [ ] **Step 2: Add to git**

```bash
git add docs/legal/PRE_LAUNCH_CHECKLIST.md
git commit -m "docs: add pre-launch legal checklist (30+ items, testing, compliance, sign-offs)"
```

---

### Task 9: Create Incorporation Checklist

**Files:**
- Create: `docs/legal/INCORPORATION_CHECKLIST.md`

**Steps:**

- [ ] **Step 1: Create incorporation checklist**

```markdown
# Synark Labs Singapore Incorporation Checklist

> **Target Date:** 2026-08-15  
> **Status:** Pending  
> **Owner:** Founder (Sam)

---

## Pre-Incorporation (Week 1)

- [ ] Decide on company name: "Synark Labs Pte. Ltd." (or alternative)
- [ ] Prepare director details (ID, address, signature, consent)
- [ ] Gather incorporation documents:
  - [ ] Copy of director's NRIC/passport
  - [ ] Director's residential address proof (utility bill, lease, bank statement)
  - [ ] Proof of company address (registered office address in Singapore)
  - [ ] Company name availability check (ACRA database)

## Incorporation Phase (Week 2-3)

### ACRA Registration (Singapore Accounting & Corporate Regulatory Authority)

- [ ] Register on ACRA eServices portal (https://www.iras.gov.sg)
- [ ] Submit Form A1 (Incorporation of a Company)
  - [ ] Company name
  - [ ] Company address (must be in Singapore)
  - [ ] Nature of business ("Computer software development and deployment")
  - [ ] Director details
  - [ ] Secretary details (if applicable)
- [ ] Submit electronically via ACRA eServices
- [ ] Pay incorporation fee (~SGD 305)
- [ ] Receive Certificate of Incorporation (within 1-2 days)
- [ ] Receive UEN (Unique Entity Number) — critical for all subsequent registrations

### Business Service Center (Registered Office)

- [ ] Register with a business service center for Singapore registered office
  - [ ] Recommended: CoSpace, JustCo, or similar (SGD 100-150/month)
  - [ ] Ensure they provide:
    - [ ] Virtual office address
    - [ ] Mail forwarding
    - [ ] Company secretary services (optional but recommended)
- [ ] Provide center with company details
- [ ] Receive registered office address confirmation

---

## Post-Incorporation (Week 3-4)

### Banking

- [ ] Open Singapore business bank account
  - [ ] Bank options: OCBC, UOB, DBS, Wise
  - [ ] Documents needed:
    - [ ] Certificate of Incorporation
    - [ ] ACRA Certificate of Accuracy
    - [ ] Director's ID + residential proof
    - [ ] Business address proof
    - [ ] UEN
  - [ ] Processing time: 2-5 business days
  - [ ] Cost: ~SGD 200-300 (one-time)

### Tax & GST Registration

- [ ] Apply for Singapore Tax ID (if not provided automatically)
  - [ ] Form P: Individual income tax return
  - [ ] Form C: Corporate tax return
- [ ] GST Registration (if revenue > SGD 1,000,000 annually)
  - [ ] Form GST 1: GST registration
  - [ ] Not required for small businesses initially, but plan for growth

### Accounting & Compliance

- [ ] Appoint company secretary (can be a professional service)
  - [ ] Cost: SGD 500-1500/year
- [ ] Appoint auditor (required if revenue > SGD 5M, optional otherwise)
- [ ] Set up accounting system (recommend QuickBooks or Xero)
- [ ] File articles of association (submitted with incorporation)

---

## Supp

ort & Handoff

- [ ] Create company bank account for subscription payments (Stripe, PayPal)
- [ ] Update Privacy Policy with new UEN and registered office
- [ ] Update Terms of Service with Singapore jurisdiction + company name
- [ ] Add company details to website footer (company name, UEN, address)
- [ ] Register with Singapore Business Federation (optional, professional membership)

---

## Timeline Summary

| Phase | Duration | Dates | Status |
|-------|----------|-------|--------|
| Pre-Incorporation | 3-5 days | 2026-08-08 to 2026-08-12 | Pending |
| ACRA Incorporation | 1-2 days | 2026-08-13 to 2026-08-14 | Pending |
| Bank Account | 2-5 days | 2026-08-15 to 2026-08-19 | Pending |
| Post-Setup | Ongoing | 2026-08-20+ | Pending |
| **Total** | **~2 weeks** | **2026-08-08 to 2026-08-21** | **Pending** |

---

## Estimated Costs

| Item | Cost (SGD) | Cost (USD) |
|------|-----------|-----------|
| ACRA Incorporation | 305 | 225 |
| Business Service Center (1 year) | 1,200 | 890 |
| Bank Account Setup | 200 | 150 |
| Company Secretary (1 year) | 1,000 | 740 |
| **Total Year 1** | **2,705** | **2,005** |
| **Ongoing (Annual)** | **2,400** | **1,780** |

---

## Legal Documents to Update After Incorporation

1. **Privacy Policy:**
   - Update Data Controller section with UEN and registered office

2. **Terms of Service:**
   - Update company name to "Synark Labs Pte. Ltd."
   - Update jurisdiction to Singapore + SIAC arbitration

3. **Website Footer:**
   - Add: "Synark Labs Pte. Ltd. (UEN: [YOUR_UEN])"
   - Add: Registered office address

4. **Data Processing Addendum:**
   - Sign Supabase DPA with new company entity

---

## Contact & Resources

- **ACRA:** https://www.acra.gov.sg
- **Singapore Business Federation:** https://www.sbf.org.sg
- **Tax Residency:** Confirm with Singapore tax advisor if based elsewhere
- **Business Service Centers:**
  - CoSpace (https://www.cospace.com.sg)
  - JustCo (https://www.justco.com)
  - Regus (https://www.regus.com/en-sg)

---

**Checklist Owner:** Founder (Sam)  
**Status:** Ready for execution  
**Target Completion:** 2026-08-21  
**Next Review:** Upon completion
```

- [ ] **Step 2: Commit**

```bash
git add docs/legal/INCORPORATION_CHECKLIST.md
git commit -m "docs: add Singapore incorporation checklist (timeline, costs, tax, banking)"
```

---

### Task 10: Create DPA Addendum Document (Template)

**Files:**
- Create: `docs/supabase/DPA_ADDENDUM.md`

**Steps:**

- [ ] **Step 1: Create DPA template document**

```markdown
# Data Processing Addendum (DPA)

**Between:** Synark Labs Pte. Ltd. (Data Controller)  
**And:** Supabase (Data Processor)  
**Date:** July 2026  
**Status:** To be executed and archived

---

## Summary

This Data Processing Addendum (DPA) governs Supabase's role as a data processor under GDPR Article 28 and APPI Article 24. It supplements the Supabase Terms of Service and clarifies data protection obligations.

---

## 1. Definitions

**"Personal Data":** Any information relating to an identified or identifiable natural person (GDPR), including financial transaction data, email addresses, device information.

**"Processing":** Any operation performed on data (collection, storage, retrieval, modification, deletion).

**"Data Subject":** The individual to whom personal data relates (Hisabify users).

**"Controller":** Synark Labs Pte. Ltd. (determines purposes and means of processing).

**"Processor":** Supabase (processes data on behalf of the Controller).

**"Sub-Processor":** Third-party providers used by Supabase (AWS, Datadog, Cloudflare, etc.).

---

## 2. Scope of Processing

**Data Categories:**
- Account information (email, name, password, timezone, currency)
- Financial data (transactions, budgets, goals, reminders, receipt images)
- Device & usage data (IP address, device type, feature usage)
- Communication data (support emails, feedback, crash reports)

**Processing Activities:**
- Data storage (PostgreSQL database in AWS/GCP)
- Data retrieval (queries from frontend)
- Data replication (backups across data centers)
- Data deletion (upon user request or retention schedule)

**Data Subjects:** Hisabify end-users (global, primarily Bangladesh)

**Duration:** For as long as Synark Labs and Supabase maintain a business relationship

---

## 3. Responsibilities

### Data Controller (Synark Labs) Responsibilities
- Determine lawful basis for data collection (consent, contract, legitimate interest)
- Ensure transparency (Privacy Policy, user rights disclosures)
- Implement user rights (access, export, deletion)
- Report data breaches to authorities and data subjects
- Conduct Data Protection Impact Assessments (DPIAs) if high-risk processing
- Maintain records of processing activities

### Data Processor (Supabase) Responsibilities
- Process data only per Controller's written instructions
- Implement appropriate technical and organizational measures (encryption, access controls)
- Maintain confidentiality (staff bound by NDA)
- Assist with data subject rights requests (access, deletion, portability)
- Notify Controller of data breaches within 72 hours (GDPR requirement)
- Notify Controller before engaging sub-processors
- Allow audits and inspections by Controller
- Delete or return data upon contract termination

---

## 4. Technical & Organizational Measures

### Encryption

**In Transit:** TLS 1.3 (no data intercepted during transmission)

**At Rest:** AES-256 (data encrypted in database storage)

**Backups:** All backup copies encrypted with AES-256

### Access Control

**Row-Level Security (RLS):** Each user can access only their own data (implemented via Supabase policies)

**Authentication:** Service role key (used by backend only, never exposed to frontend)

**Audit Logging:** Access logs maintained and audited monthly

### Data Segregation

- User data isolated per tenant (PostgreSQL row-level security)
- No cross-user data leakage (enforced by RLS policies)
- Separate backups for each customer account (standard practice)

### Disaster Recovery

**Backup Frequency:** Continuous replication, daily snapshots

**Recovery Time Objective (RTO):** < 1 hour (SLA commitment)

**Backup Retention:** 30 days (production data), 7 years (archival for compliance)

### Monitoring & Logging

- Supabase monitoring dashboard (uptime, performance)
- Sentry integration for error tracking (anonymised)
- Database audit logs (DDL changes, user access)

---

## 5. Sub-Processors

Supabase uses the following sub-processors. Controller is notified of changes and can object to new sub-processors within 30 days.

**Current Sub-Processors:**
1. **Amazon Web Services (AWS)** — Cloud infrastructure (EC2, S3, RDS)
2. **Datadog** — Monitoring and observability
3. **Cloudflare** — DDoS protection and CDN
4. **GitHub** — Source code repository (for Supabase infrastructure)
5. **Google Cloud** — Backup storage

**Updated Sub-Processor List:** Available at https://supabase.com/dpa (Supabase maintains current list)

**Notification Process:**
- Supabase notifies Controller of new sub-processors 30 days in advance
- Controller can object within 30 days
- If objection raised, Controller can terminate contract without penalty

---

## 6. Data Subject Rights Assistance

Supabase will assist Synark Labs in fulfilling data subject rights requests:

- **Right to Access:** Supabase provides SQL queries to extract user data
- **Right to Rectification:** Supabase allows data updates via API
- **Right to Erasure ("Right to be Forgotten"):** Supabase provides deletion APIs; Controller manages 30-day grace period
- **Right to Data Portability:** Supabase provides export APIs (CSV, JSON)
- **Right to Restrict Processing:** Supabase can restrict specific user records per request

**Response Time:** Supabase assists within 48 hours of request (Controller responsible for 30-day data subject deadline)

---

## 7. Data Breach Notification

**Incident Detection:** Supabase monitors for unauthorized access, data exfiltration, ransomware

**Controller Notification:** Supabase notifies Controller within 72 hours of discovering a breach

**Information Provided:**
- Description of breach (what data, when, how)
- Likely consequences (impact on data subjects)
- Measures taken to mitigate harm
- Controller's Data Protection Officer contact (if applicable)

**Controller Responsibilities:**
- Notify data protection authorities within 72 hours (GDPR requirement)
- Notify affected users without undue delay if high-risk breach
- Document breach in incident log

**Limitation:** Supabase is not liable for breaches caused by Controller's misuse (e.g., weak passwords, insecure app code)

---

## 8. Data Deletion & Termination

**Upon Contract Termination:**

1. **Data Return/Deletion:** Supabase deletes all Controller data within 30 days of termination (backups within 90 days)
2. **Certification:** Supabase provides written certification of deletion
3. **Residual Data:** Supabase may retain anonymised aggregate statistics (no personal data)
4. **Compliance Data:** Supabase may retain data required by law (legal holds, tax records)

**30-Day Deletion Compliance:**
- Supabase implements automated cleanup (RPC function scheduled via pg_cron)
- Deleted data removed from backups within 90 days
- Data subject can request emergency deletion (expedited within 7 days)

---

## 9. Audits & Inspections

### Supabase Provides

- **SOC 2 Type II Report:** Annual independent security audit (available to Controller upon request)
- **Penetration Testing:** Annual third-party penetration testing
- **Vulnerability Scanning:** Automated weekly security scans
- **Incident Reports:** Monthly security summary (shared with enterprise customers)

### Controller May Request

- On-site audit/inspection (reasonable notice, reasonable frequency)
- Audit reports and certifications
- Documentation of security controls
- Subcontractor audit reports

**Limitation:** Audits conducted during business hours, no more than once per year (unless breach/incident)

---

## 10. International Data Transfers

**Data Location:** Supabase stores data in one of: US (N. Virginia), EU (Ireland, Frankfurt), Asia-Pacific (Singapore)

**For EU Data Subjects (GDPR):**
- US transfers rely on Standard Contractual Clauses (SCCs)
- EU adequacy decision pending (post-Schrems II)
- Alternative: Transfer data to EU region (Ireland or Frankfurt)

**For Japan Data Subjects (APPI):**
- Transfers comply with APPI Chapter 4 (appropriate safeguards)
- Supabase provides data protection guarantees

**For Bangladesh Data Subjects:**
- Current: Data stored in US/EU (disclosed to users)
- Future: Migration to Asia-Pacific region once Bangladesh law enacted

---

## 11. Data Protection Impact Assessment (DPIA)

**Requirement:** GDPR Article 35 requires DPIA for high-risk processing

**Financial Data Processing:** Hisabify processes special category data (financial data), triggering DPIA requirement

**DPIA Responsibility:** Synark Labs (Controller) responsible for conducting DPIA

**Supabase Responsibility:** Subabase provides technical measures, audit reports, and documentation to support DPIA

**Assessment Scope:**
- Necessity and proportionality of data collection
- Risk to data subjects (privacy risks, discrimination, financial loss)
- Mitigating controls (encryption, RLS, access controls)
- Residual risks (data breach probability, impact)

---

## 12. Compliance & Liability

**Governing Law:** Singapore

**GDPR Compliance:** This DPA ensures compliance with GDPR Articles 28-32 (Processor Obligations)

**APPI Compliance:** This DPA aligns with APPI Article 24 (use of sub-processors)

**Liability:**
- Processor liable for breaches of Article 28 obligations
- Liability capped per Supabase Terms of Service
- Controller liable for lawful basis and user consent

**Indemnification:** 
- Supabase indemnifies Controller for third-party claims alleging breach of this DPA
- Controller indemnifies Supabase for claims arising from Controller's instructions

---

## 13. Term & Termination

**Effective Date:** Upon execution by both parties

**Term:** Continues for as long as Synark Labs and Supabase have a business relationship

**Termination:** 
- Either party may terminate for convenience (30 days' notice)
- Automatic termination if main service agreement terminates
- Supabase deletes all data within 30 days of termination

**Survival:** Data protection obligations survive termination for as long as data is retained

---

## 14. Amendments

This DPA may be amended if:
1. Required by law or regulatory authority
2. Supabase changes sub-processors (30-day notice, Controller can object)
3. Both parties agree in writing

Changes take effect upon written agreement (Controller consent required for material changes).

---

## Execution

**Data Controller:**
Company: Synark Labs Pte. Ltd.  
Name: [Director Name]  
Title: Founder  
Signature: ______________________  
Date: ______________________

**Data Processor:**
Company: Supabase Inc.  
Name: [Supabase Signatory]  
Title: [Title]  
Signature: ______________________  
Date: ______________________

---

## Appendices

### Appendix A: Processing Details
- Data categories (list above)
- Processing purposes (provide app features, improve features, legal compliance)
- Data subjects (Hisabify end-users)
- Duration (ongoing + 30 days post-deletion)

### Appendix B: Security Measures (Reference)
- TLS 1.3 encryption in transit
- AES-256 encryption at rest
- Row-Level Security (RLS) access control
- Automated daily backups
- SOC 2 Type II certification

### Appendix C: Sub-Processor Contact Information
- AWS: https://aws.amazon.com/compliance/gdpr-center
- Datadog: https://www.datadoghq.com/legal/data-processing-agreement
- Cloudflare: https://www.cloudflare.com/gdpr/introduction
- Google Cloud: https://cloud.google.com/privacy/gdpr

---

**Document Version:** 1.0  
**Status:** Ready for execution  
**Last Updated:** 2026-07-30

```

- [ ] **Step 2: Commit**

```bash
git add docs/supabase/DPA_ADDENDUM.md
git commit -m "docs: add Data Processing Addendum (DPA) template for Supabase compliance"
```

---

## Summary & Execution Paths

All 10 tasks are now defined. Here's the completion status:

| Task | Files | Status |
|------|-------|--------|
| 1. Expand Terms of Service | `src/lib/legalContent.tsx` | Ready to implement |
| 2. Expand Privacy Policy | `src/lib/legalContent.tsx` | Ready to implement |
| 3. Create SubscriptionTermsContent | `src/components/SubscriptionTermsContent.tsx` | Ready to implement |
| 4. Create SubscriptionTermsPage | `src/pages/SubscriptionTermsPage.tsx` | Ready to implement |
| 5. Create useDataManagement Hook | `src/hooks/useDataManagement.ts` | Ready to implement |
| 6. Add Privacy Controls to Settings | `src/components/PrivacyControls.tsx` | Ready to implement |
| 7. Supabase Migrations | `supabase/migrations/20260730_*.sql` | Ready to implement |
| 8. Pre-Launch Checklist | `docs/legal/PRE_LAUNCH_CHECKLIST.md` | Ready to implement |
| 9. Incorporation Checklist | `docs/legal/INCORPORATION_CHECKLIST.md` | Ready to implement |
| 10. DPA Addendum | `docs/supabase/DPA_ADDENDUM.md` | Ready to implement |

---

## Plan Complete & Saved

Plan document saved to: **`docs/superpowers/plans/2026-07-30-hisabify-legal-framework.md`**

**Two execution options:**

### **1. Subagent-Driven (Recommended)**
I dispatch a fresh subagent per task with full code, testing strategy, and review gates between tasks. Fast, parallel-friendly, high quality.

**Invoke:** `superpowers:subagent-driven-development` with this plan

### **2. Inline Execution** 
I execute tasks sequentially in this session using `superpowers:executing-plans`, batch review every 3 tasks.

**Invoke:** `superpowers:executing-plans` with this plan

---

**Which execution path do you prefer?**