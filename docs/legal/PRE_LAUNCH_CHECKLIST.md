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
- [ ] Data export functionality implemented (CSV/JSON) — `useDataManagement.exportData()`
- [ ] Account deletion implemented — `/profile/data` → Delete Account → `delete-user` edge function
- [ ] Supabase migration `20260730000000_add_privacy_audit_log.sql` applied
- [ ] `audit_log` RLS verified: own-row SELECT/INSERT only, no UPDATE/DELETE
- [ ] Data export tested end-to-end (both CSV and JSON download)
- [ ] Verified deletion is immediate and irreversible — there is deliberately
      **no** 30-day grace period or soft-delete. The Privacy Policy's "within
      30 days" is a ceiling, which immediate deletion satisfies. Do not add a
      soft-delete path without also shipping a purge job.

### Privacy Controls
- [ ] Data & Privacy reachable from Settings (the Privacy Policy directs users there)
- [ ] Analytics opt-out toggle working (localStorage `analytics_opted_out`)
- [ ] Opt-out actually honoured at analytics call sites, not just stored
- [ ] "Do Not Track" browser signal respected (verified in code)
- [ ] Sentry crash reporting opt-out working

### Legal Page Links
- [ ] `/privacy` route renders full Privacy Policy
- [ ] `/terms` route renders Terms of Service *and* Subscription & Billing, each under its own heading
- [ ] `/subscription-terms` redirects to `/terms` (kept for any live store-listing link)
- [ ] Both routes load while signed out, and Back goes to `/auth`
- [ ] Terms of Service still opens via `LegalModal` at signup (AuthPage only)
- [ ] In-app Settings → Legal links Terms & Conditions and Privacy Policy
- [ ] Settings → Data & Privacy links Privacy Policy and Terms & Conditions
- [ ] "Last updated: [DATE]" displays exactly once per legal page and once in `LegalModal`

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
- [ ] Test: Create account → Delete Account → verify auth user and all rows are gone immediately
- [ ] Test: Delete Financial Data → verify records gone but login still works
- [ ] Test: both flows require typing the exact confirmation phrase
- [ ] Test: `audit_log` row is written **before** sign-out (the RLS INSERT policy needs a live session)
- [ ] Test: deleted account cannot sign in again and data is not recoverable
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
- [ ] Engineering team knows deletion is immediate and irreversible (no grace period)
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
- [ ] Verify `delete-user` edge function succeeds in production (check Supabase logs)
- [ ] Test privacy request response (send yourself a request, track response time)
- [ ] Monitor analytics opt-out rate (expect 5-10% initially)
- [ ] Check error logs for data export failures (should be none)

---

**Checklist Version:** 1.0  
**Last Reviewed:** 2026-07-30  
**Next Review:** 2026-10-30 (quarterly)
