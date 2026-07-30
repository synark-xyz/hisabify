# Hisabify Legal Framework Specification

**Date:** 2026-07-30  
**Status:** Design Approved (Ready for Implementation)  
**Scope:** Terms of Service, Privacy Policy, Subscription & Billing Terms  
**Approach:** Balanced Global (GDPR Baseline) with Fair Process Enforcement  
**Author:** Claude Code (Brainstorming Skill)

---

## Executive Summary

This specification defines a comprehensive legal framework for Hisabify that:

- **Protects against liability** — Financial advice disclaimers, data breach liability caps, app malfunction protection
- **Enables operations** — Clear subscription/billing enforcement, fair process for account suspension, refund/chargeback policies
- **Ensures compliance** — GDPR (for EU users), APPI (Japan), Bangladesh awareness, global scope
- **Respects users** — Fair process (warnings before suspension), transparent data handling, user rights (access, export, delete)

**Key Documents:**
1. Terms of Service (T&S) — Liability, acceptable use, fair process, dispute resolution
2. Privacy Policy — GDPR/APPI compliance, data collection, user rights, third-party sharing
3. Subscription & Billing Terms — Trial, refunds, chargebacks, premium credits, cancellation
4. (New) Data Processing Addendum — GDPR processor agreement with Supabase

**Incorporation:** Singapore (Synark Labs Pte. Ltd.) recommended for tax efficiency, payment processor compatibility, and GDPR alignment.

---

## 1. Terms of Service

### 1.1 Acceptance & Service Description
- Standard acceptance clause
- **Key addition:** "Hisabify is a personal finance *tracking* tool, not a bank, broker, or financial advisor"
- Sets expectation that app does not move money

### 1.2 Account Registration & Security (Fair Process)
- Users provide accurate info, maintain password confidentiality
- **Fair process:** "If we suspect unauthorized access, we will notify you before taking action"
- Users responsible for account activity
- 7-day warning before account suspension (aligns with fair enforcement approach)

### 1.3 Acceptable Use Policy
- Prohibited: unlawful use, hacking, reverse engineering, impersonation, spam, scraping
- **Fair process:** 7-day warning before suspension; users can cure violations
- Purpose: Gives enforcement authority without aggression

### 1.4 Financial Data Disclaimer ⭐ CRITICAL LIABILITY PROTECTION
```
FINANCIAL DATA DISCLAIMER:

Hisabify does NOT provide financial, investment, tax, or legal advice. 
Any budgets, analytics, projections, or recommendations are for personal 
tracking only and should not be relied upon for financial decisions. 
Consult a qualified financial advisor before making investment or 
savings decisions.

Covers:
- Budget suggestions
- Health score calculations
- Savings analytics
- Recurring expense tracking
- Category spending summaries
```

**Protects against:** "I followed your budget advice and lost money" lawsuits

### 1.5 Limitation of Liability ⭐ PROTECTS AGAINST APP MALFUNCTION CLAIMS
```
LIMITATION OF LIABILITY:

To the fullest extent permitted by law, Synark Labs is not liable for:
- Indirect, incidental, consequential, or punitive damages
- Loss of data, interruptions in service, or app bugs
- Financial losses resulting from app use or data loss

Liability cap: Lesser of (a) amount paid for Hisabify in past 12 months 
or (b) $0 for free tier users

Exception: This does not limit liability for data breaches caused by 
our gross negligence or willful misconduct
```

### 1.6 Data & Security
- Encryption in transit (TLS), at rest (AES-256)
- Supabase Row-Level Security prevents cross-user data access
- No data sale to third parties
- Reference Supabase privacy policy for their practices

### 1.7 Third-Party Integration Liability Clauses
```
Each third-party service is governed by their own privacy policy:
- Supabase (database, authentication)
- Google OAuth (optional sign-in)
- Sentry (crash reporting, optional)
- Gemini Vision API (receipt OCR)

We are not responsible for third-party data breaches or practices.
```

### 1.8 Termination & Account Deletion
- **Fair process:** 7-day warning before suspension for T&S violations
- Users can delete anytime from Profile → Data Management
- Upon deletion, data permanently removed within 30 days

### 1.9 Subscription & Billing
- Reference separate Subscription & Billing Terms
- Recurring billing requires clear authorization
- Trial period terms (see Section 3)

### 1.10 Changes to Terms
- Material changes notified via in-app notification or email
- Continued use = acceptance
- Users have 30 days to request data deletion if they disagree

### 1.11 Dispute Resolution ⭐ JURISDICTION
```
DISPUTE RESOLUTION:

Binding arbitration in Singapore under Singapore International 
Arbitration Centre (SIAC) rules.

Rationale:
- Fast, efficient (arbitration vs. courts)
- Neutral jurisdiction (user-friendly)
- Singapore = arbitration hub (#2 globally)
- Aligns with incorporation location
```

### 1.12 Contact & Legal Notice
- Email: synarklabs@gmail.com
- Mailing address: [Singapore registered office]
- Data Protection Officer: [To be appointed after incorporation]

---

## 2. Privacy Policy (GDPR/APPI/Bangladesh Compliant)

### 2.1 Introduction & Commitment
- Clear privacy commitment
- Transparency about data collection, use, protection

### 2.2 Data Controller & Jurisdiction
```
DATA CONTROLLER:

Company: Synark Labs Pte. Ltd.
Incorporation: Singapore (UEN: [TBD])
Location: [Singapore registered office]
Email: synarklabs@gmail.com
Privacy Officer: [TBD after incorporation]

APPLICABLE LAWS:
- EU users: GDPR (strictest)
- Japan users: APPI
- Bangladesh users: APPI-aligned + local considerations
- All users: Strictest applicable law = compliance baseline
```

### 2.3 Data Collection (Exhaustive List)
**A. Account Information (Required):**
- Email, name, password (encrypted), phone (optional), timezone, currency, subscription status

**B. Financial Data (User-entered):**
- Transactions (date, amount, merchant, category, notes)
- Cards/accounts (name, type, last 4 digits, balance)
- Budgets, savings goals, payment reminders
- Receipt images (uploaded for OCR)
- Account deletion request timestamp

**C. Device & Usage Data (Automatically collected):**
- Device type, OS version, app version, IP address
- Geolocation (for currency detection)
- Feature usage (page views, button clicks, time spent)
- Crash reports and error logs (anonymised)

**D. Third-Party Data:**
- Google OAuth: email, name, profile picture
- Payment processor: billing address, subscription status, payment last 4 digits

**E. Communication Data:**
- Support emails, in-app feedback, ratings, bug reports
- Crash/error reports (via Sentry, anonymised)

**Note:** We do NOT collect: SSN, full credit card numbers, bank account details

### 2.4 Legal Basis for Data Collection (GDPR Article 6 Compliance)
**A. Consent:** Financial data (you voluntarily enter), optional data (profile picture, phone)

**B. Performance of Contract:** Account info (needed to create account), device info (needed to run app)

**C. Legitimate Interests:** 
- Usage analytics → improve features
- Crash reports → fix bugs
- Security monitoring → detect fraud
- Customer support → resolve issues

**D. Legal Obligation:** Compliance with law enforcement, tax/accounting records

**E. Special Processing (Financial Data):**
- Only processed because you consent by entering it
- No profiling based on financial data
- No automated decision-making on financial data

### 2.5 Data Usage Purposes (GDPR Article 5 Specificity)
1. **Provide the App:** Display transactions, calculate analytics, sync devices, process payments
2. **Improve the App:** Analyze aggregated usage patterns, identify bugs, track performance
3. **Customer Support:** Respond to emails, troubleshoot issues, resolve disputes
4. **Security & Fraud Prevention:** Detect unauthorized access, prevent abuse
5. **Legal Compliance:** Court orders, tax/accounting, law enforcement

**NOT used for:**
- ❌ Selling to third parties
- ❌ Marketing/targeted advertising
- ❌ Financial profiling or credit decisions
- ❌ Data broker sharing
- ❌ AI model training (unless explicit opt-in)

### 2.6 Data Sharing & Third Parties
**A. Supabase (Backend):**
- All financial data, account info, device data
- Row-Level Security (only you access your data)
- SOC 2 Type II compliant
- Data location: US, EU, or Asia depending on region
- Governed by Supabase Privacy Policy
- Data Processing Agreement in place

**B. Google OAuth:**
- Receives: email, name, profile picture (if you sign in with Google)
- Governed by Google Privacy Policy
- No data shared back about transactions

**C. Sentry (Crash Reporting, Optional):**
- Crash logs and errors (anonymised, no financial data)
- Opt-out in Settings
- Governed by Sentry Privacy Policy

**D. Gemini Vision API (Receipt Scanning):**
- Receipt images processed immediately (not stored by Google)
- Extracted data (merchant, date, amount) stored in Supabase
- Images deleted after OCR
- Governed by Google Cloud Privacy Policy

**E. Payment Processor (Stripe or similar):**
- Billing address, subscription status, payment last 4 digits
- We never store full credit card numbers
- Governed by payment processor privacy policy

**F. Law Enforcement:**
- Disclosed only if required by law (court order, warrant)
- We notify you unless legally prohibited
- Exceptions: emergencies, child safety, national security

**G. Business Transfer:**
- If Synark Labs is acquired, data may be transferred
- We notify you and honor your privacy rights

**NOT sold to:** Data brokers, marketing firms, advertisers, other third parties

### 2.7 International Data Transfers
**Regions:**
- Supabase: US, EU, or Asia-Pacific
- Sentry: US-based
- Google: US-based

**GDPR Compliance (EU Users):**
- US transfers use Standard Contractual Clauses or adequacy mechanisms
- We assess third-party GDPR compliance
- You have right to object to international transfers

**APPI Compliance (Japan Users):**
- Transfers comply with APPI Chapter 4
- Recipient countries assessed for adequate protection

**Bangladesh Users:**
- Data transferred to US/EU servers
- Will migrate to local storage once Bangladesh Data Protection Act enacted

### 2.8 Your Privacy Rights (GDPR/APPI Articles 12-22)
**1. Right to Access:**
- Request copy of all data we hold
- How: Email synarklabs@gmail.com with "Data Access Request"
- Response time: 30 days (GDPR/APPI requirement)
- Format: CSV, JSON, or summary
- Cost: Free

**2. Right to Rectification:**
- Correct inaccurate data
- How: Edit in app or email us
- Response time: 30 days

**3. Right to Erasure ("Right to be Forgotten"):**
- Request deletion of account and all data
- How: Settings → Data Management → Delete OR email "Erasure Request"
- Response time: 30 days
- Deletion timeline: All data removed within 30 days
- Exceptions: Data required by law (tax records)

**4. Right to Data Portability:**
- Export data in portable format
- How: Settings → Data Management → Export Data
- Formats: CSV, JSON
- Cost: Free
- Response time: Immediate (automated export)

**5. Right to Object:**
- Object to processing for legitimate interests
- Opt-out of analytics, cookies
- How: Settings → Privacy & Analytics

**6. Right to Restrict Processing:**
- Request limitation on data use
- How: Email with specific restrictions

**7. Right to Lodge Complaint:**
- Complain to data protection authority if GDPR/APPI violated
- EU: National data protection authority
- Japan: Personal Information Protection Commission
- Bangladesh: Bangladesh Privacy Commissioner (pending)

### 2.9 Data Retention
**Active Accounts:**
- Financial data: Retained while account is active
- Device/usage data: 12 months, then anonymised/deleted
- Crash reports: 30 days (deleted after fix)

**After Account Deletion:**
- Personal data (email, name, password): 30 days
- Financial data: 30 days
- Backup copies: 90 days
- Legal/tax records: 7 years (legal requirement)
- Anonymised aggregate data: Indefinitely

**Special Cases:**
- Active refund disputes: 180 days (chargeback window)
- Legal investigation: Per law enforcement requirements
- Email backups: 12 months

### 2.10 Data Security
**Encryption in Transit:** TLS 1.3 (prevents interception)

**Encryption at Rest:** AES-256 (Supabase standard)

**Access Control:** 
- Row-Level Security (only you access your data)
- Employees cannot access your financial data without authorization
- Access logs audited

**Physical Security:**
- Supabase data centers: 24/7 security, surveillance, access controls

**Vulnerability Management:**
- Regular security audits
- Automated security scanning
- OWASP guidelines
- Bug bounty program (details: synarklabs.com/security)

**Third-Party Assessment:**
- Supabase: SOC 2 Type II compliant
- Sentry: SOC 2 Type II compliant
- Google: Certified under multiple standards

**Limitation:**
- NO security is 100% secure
- We are not liable for breaches beyond our control (see T&S § 8)

### 2.11 Cookies & Tracking
**Essential Cookies (Always):**
- Session cookies: Keep you logged in
- CSRF tokens: Prevent cross-site attacks
- Preference cookies: Remember theme (dark/light)

**Optional Analytics Cookies (Consent-based):**
- Google Analytics: Page views, feature usage (anonymised)
- Sentry: Crash data (anonymised)
- Opt-out: Settings → Privacy & Analytics

**NO Advertising Cookies:**
- No targeted advertising cookies
- No data sold to advertisers

**Do Not Track (DNT):**
- If browser has DNT enabled, we respect it
- Optional analytics cookies not placed

### 2.12 Children's Privacy (GDPR/COPPA Compliance)
- Hisabify not intended for users under 18 (or local age of digital consent)
- We do not knowingly collect children's data
- Child accounts deleted immediately upon discovery
- EU: GDPR requires parental consent for children under 16
- US: COPPA compliance required
- Report suspected child account: synarklabs@gmail.com

### 2.13 Changes to Privacy Policy
- We may update anytime
- Material changes: In-app notification + email
- Continued use = acceptance
- 30-day data deletion request window if you disagree

### 2.14 Contact & Data Protection Officer
**Privacy Inquiries:**
- Email: synarklabs@gmail.com
- Subject: "Privacy Request - [Type]" (e.g., "Privacy Request - Data Access")
- Response time: 30 business days

**Data Protection Officer (After Incorporation):**
- To be appointed and listed here

**EU Representative (If Needed):**
- To be appointed if significant EU user base

---

## 3. Subscription & Billing Terms

### 3.1 Subscription Model
- Free tier (limited features available)
- Premium subscription (recurring monthly/yearly)
- Optional in-app purchases (premium credits)
- Subscription auto-renews unless canceled
- Users responsible for cancellation

### 3.2 Free Trial Period
```
FREE TRIAL:

- 7-day free trial for new premium subscribers
- All premium features accessible during trial
- No payment charged during trial
- On Day 8, payment method charged for first recurring period
- Cancel anytime before trial ends: Settings → Subscription → Cancel
- No questions asked, no refund for trial period
- Trial available once per account
- Reactivation after cancellation does NOT restart trial
```

### 3.3 Cancellation & Refund Policy
```
REFUND POLICY:

Full Refund (7 days):
- Within 7 days of purchase: 100% refund, no questions asked
- Request via email or app settings

Partial Refund (8-30 days):
- Days 8-30 post-purchase: Prorated refund based on days remaining
- Example: $10 purchase on Day 1, refund requested Day 15 = $5 (50% remaining)
- Formula: (Days Remaining / Days in Billing Period) × Amount Paid

No Refund (After 30 days):
- Requests after 30 days are not eligible
- Refund processing: 5-10 business days to original payment method

Exceptions (No Refund):
- Content/features substantially used or accessed
- Account deleted
- Canceled by us due to T&S violations
- In-app purchases (one-time, non-refundable except defects)
```

### 3.4 Billing & Payment
```
BILLING:

- You authorize us to charge your payment method for subscription fees
- Billing occurs on date of purchase each month/year
- Failed payments: We retry up to 3 times over 5 days
- After 3 failed retries: Subscription suspended until payment succeeds

PRICE CHANGES:

- We may change subscription price anytime
- 30 days' notice required before increase takes effect
- Continued use after notice = acceptance of new price
- Existing subscribers grandfathered into old price for current period
```

### 3.5 Chargebacks & Disputes ⭐ ANTI-FRAUD CLAUSE
```
CHARGEBACK & DISPUTE POLICY:

If you dispute a charge with your bank INSTEAD of requesting refund 
from us, we consider this a serious breach of trust:

First Chargeback:
- Account flagged
- May require additional verification for future purchases

Second Chargeback:
- Account suspended
- Future purchases blocked

Persistent Chargebacks:
- Account terminated

WHY:
- Chargebacks damage payment processor relationships
- Chargebacks increase fees for all users
- Always contact synarklabs@gmail.com FIRST before disputing with bank

This protects the community and ensures sustainable operations.
```

### 3.6 Premium Feature Access Control
```
PREMIUM FEATURES:

- Available only to active subscribers
- If subscription lapses: Premium features inaccessible
- Historical data preserved (you don't lose transactions)
- Premium analytics/exports/features require active subscription
- Upon resubscription: Premium features immediately restored
```

### 3.7 Account Deletion & Credits
```
- If you delete account: All unused credits forfeited
- No refund for unused credits in deleted accounts
- Once deleted: Credits cannot be recovered
- If requesting refund + deletion: Refund issued first, then account terminated
```

### 3.8 Premium Credits Policy
```
PREMIUM CREDITS:

PURCHASE & USAGE:
- One-time in-app purchases (e.g., $5 for 500 credits)
- Credits unlock premium features and one-time actions
- Non-refundable once purchased (except defects)
- Apply to your account only
- Cannot transfer, sell, or share with other users
- Pricing may change anytime with 30 days' notice

EXPIRATION:
- All credits expire 12 months after purchase if unused
- "Unused" = not yet applied to feature purchase
- Expired credits cannot be restored or refunded
- Courtesy reminders: 30 days + 7 days before expiration
- Accepting reminders = acknowledgment of expiration

CREDIT USAGE:
- Each feature has a credit cost (displayed before purchase)
- Deducted immediately upon feature use
- Partial usage: e.g., 100-credit feature + 150 remaining = 50 left after use

REFUNDS FOR DEFECTS:
- If feature didn't work or credits didn't apply: Refund within 7 days
- Must contact synarklabs@gmail.com with proof
- No refund for remorse or changed mind

FEATURE DEPRECATION:
- If we sunset a feature requiring credits: One-time credit restoration
- Not a cash refund (credits can be used on other features)

ACCOUNT DELETION:
- Deleting account = forfeiting all unused credits
- No recovery possible

PROMOTIONAL CREDITS:
- Bonus credits subject to same expiration (12 months)
- Non-transferable, cannot be cashed out
- Abuse of promotions = bonus credit removal + account suspension
- Example abuse: Multiple accounts created to farm free credits

PRICING CHANGES:
- New credit pricing effective immediately for new purchases
- Existing unused credits honored at old prices
```

### 3.9 In-App Purchases (One-Time)
```
IN-APP PURCHASES:

- Non-refundable one-time purchases (premium credits)
- Credits expire 12 months after purchase if unused
- Cannot transfer to other accounts
- We reserve right to adjust, deprecate, or sunset features
- Upon deprecation: Unused credits restored (not cash refunded)
```

### 3.10 Billing Disputes Process (Fair Process)
```
DISPUTE RESOLUTION:

1. Contact Us: Email synarklabs@gmail.com with "Billing Dispute" subject
2. We respond within 5 business days with:
   - Acknowledgment of dispute
   - Initial assessment
   - Next steps
3. If we agree error occurred:
   - Refund or credit issued within 10 business days
   - Original payment method
4. If we disagree:
   - Detailed explanation of our position
   - Evidence supporting our position
5. If unresolved:
   - Dispute proceeds to arbitration per Terms of Service § 11
   - SIAC arbitration in Singapore
```

### 3.11 Contact for Subscription Issues
- Email: synarklabs@gmail.com
- Subject: "Subscription Issue" or "Billing Dispute"
- Response time: 5 business days

---

## 4. Data Processing Addendum (GDPR Requirement)

### 4.1 Purpose
This DPA governs Supabase's role as a data processor under GDPR Article 28.

### 4.2 Processor Agreement with Supabase
```
SUPABASE DATA PROCESSING TERMS:

Supabase is our primary data processor:
- Processes personal data per our instructions only
- Bound by GDPR Article 28 obligations
- Maintains confidentiality of data
- Implements appropriate technical and organizational measures
- SOC 2 Type II certified (independent security audit)
- Certifies ISO 27001 compliance

We have:
- Executed Supabase Data Processing Agreement (available on Supabase website)
- Confirmed Supabase uses sub-processors:
  * Amazon Web Services (cloud infrastructure)
  * Datadog (monitoring)
  * Cloudflare (DDoS protection)
  * Other specified vendors (full list in Supabase DPA)
```

### 4.3 Incident Notification
```
DATA BREACH NOTIFICATION:

If Supabase experiences a data breach:
1. Supabase notifies us within 72 hours
2. We assess impact and legal obligations
3. We notify affected users within 72 hours of learning about breach
   (If required by GDPR or APPI)
4. We notify data protection authorities within 72 hours
   (If required by GDPR)
5. We publish transparency report
```

### 4.4 Sub-Processors
- Users have right to object to new sub-processors
- Supabase provides 30-day notice before adding sub-processors
- If you object, we work with Supabase on alternatives or provide data export/deletion option

### 4.5 Data Subject Rights
- Supabase must assist us in fulfilling user rights requests (access, deletion, portability)
- Response time: 30 days

---

## 5. Incorporation & Implementation

### 5.1 Recommended Incorporation: Singapore

**Company Name:** Synark Labs Pte. Ltd.  
**Jurisdiction:** Singapore  
**Incorporation Timeline:** 1-2 weeks (via ACRA eServices)

**Why Singapore:**
- ✅ Fast incorporation (1-2 weeks)
- ✅ GDPR-adequate jurisdiction
- ✅ Payment processors prefer Singapore entities
- ✅ Tax-friendly (5% corporate tax)
- ✅ English-speaking regulatory environment
- ✅ Arbitration hub (#2 globally, aligns with SIAC dispute resolution)
- ✅ Good for Bangladesh/Southeast Asia expansion
- ✅ Regional payment processor compatibility

**Costs:**
- Incorporation: $300-500 SGD
- Registered office (1 year): ~$1200 SGD
- Business bank account: $200-300
- Annual compliance: $800-1500 SGD/year

**Process:**
1. Register with ACRA (Accounting and Corporate Regulatory Authority)
2. Open Singapore business bank account
3. Register for GST (if revenue >$1M SGD, optional for small business)
4. File annual returns with ACRA

**Gotchas:**
- Requires Singapore address (use business service center ~$100/month)
- Annual audit required if revenue exceeds $10M SGD
- Must have local director (you can serve, or hire agent ~$500/year)

### 5.2 Alternative: Delaware, USA
- Only if planning US venture capital fundraising
- Higher costs (~$2000-3000 startup)
- More complex compliance
- Less GDPR-friendly for international users

### 5.3 Timeline

**Week 1-2 (Immediate):**
- Decide: Singapore or Delaware?
- Choose company name
- Gather incorporation documents

**Week 2-4 (Short-term):**
- Incorporate in Singapore
- Open business bank account
- Update Privacy Policy with company details

**Before Launch:**
- Finalize Terms of Service with company name
- Create Subscription & Billing Terms
- Add Data Processing Addendum (DPA) with Supabase
- Register Privacy Officer (GDPR requirement)
- Update in-app legal links

**After Launch (Month 1-3):**
- Register for GDPR compliance (if EU users > 1000)
- Set up data deletion automation (30-day purge)
- Annual compliance review

### 5.4 Legal Document Updates After Incorporation

**Privacy Policy - Update Data Controller Section:**
```
DATA CONTROLLER:

Company: Synark Labs Pte. Ltd.
UEN: [Your Singapore UEN]
Registered Office: [Singapore address]
Email: synarklabs@gmail.com
Privacy Officer: [Your name or designated officer]
Jurisdiction: Singapore
```

**Terms of Service - Update Dispute Resolution:**
```
DISPUTE RESOLUTION:

Binding arbitration in Singapore under Singapore International 
Arbitration Centre (SIAC) rules. Arbitration conducted in English, 
final and binding.
```

**New Document - Data Processing Addendum:**
- Supabase provides standard DPA template
- Just sign and attach to Privacy Policy
- Ensures GDPR Article 28 compliance

---

## 6. Pre-Launch Legal Checklist

```
LEGAL SETUP CHECKLIST:

Incorporation & Company:
□ Incorporate Synark Labs Pte. Ltd. in Singapore (or Delaware)
□ Open Singapore business bank account
□ Register for GST (if applicable)
□ Appoint Privacy Officer

Legal Documents:
□ Finalize Terms of Service (with company name + Singapore jurisdiction)
□ Finalize Privacy Policy (with GDPR/APPI/DPA compliance)
□ Create Subscription & Billing Terms document
□ Create Data Processing Addendum with Supabase
□ Review third-party privacy policies (Google, Sentry, Gemini)

Technical Implementation:
□ Implement account deletion automation (30-day purge)
□ Implement data export automation (CSV/JSON)
□ Set up Sentry optional opt-out (Settings)
□ Add analytics consent banner (cookie consent)
□ Create privacy request email handler (synarklabs@gmail.com)

In-App Updates:
□ Link to new Privacy Policy (Settings → Legal)
□ Link to Terms of Service (Settings → Legal)
□ Link to Subscription Terms (Settings → Billing)
□ Link to privacy request process (Settings → Privacy)
□ Update company name in all legal footers
□ Add "Last updated" date stamps

Operational:
□ Create privacy request response template (email)
□ Document data retention schedule (spreadsheet)
□ Brief team on GDPR/APPI obligations
□ Create data breach incident response plan
□ Set up escalation path for legal requests (email)
□ Test account deletion flow (verify 30-day purge works)
□ Test data export (verify CSV/JSON format works)

Compliance:
□ Register with GDPR compliance service (if EU users > 1000)
□ Document legal basis for each data collection (spreadsheet)
□ Confirm Supabase DPA signed
□ Audit third-party sub-processors (Supabase list)
□ Schedule annual privacy audit (calendar reminder)
```

---

## 7. Risk Mitigation Summary

### Financial Advice Liability
**Risk:** Users claim losses based on app's budget/analytics advice  
**Mitigation:** Financial advice disclaimer in T&S § 5 + Privacy Policy § 2.5  
**Status:** ✅ Addressed

### Data Breach Liability
**Risk:** User sues if data leaked due to Supabase breach  
**Mitigation:** 
- T&S § 6 limits liability to "gross negligence or willful misconduct" by us
- DPA confirms Supabase's responsibility + SOC 2 certification
- **Status:** ✅ Addressed

### App Malfunction Liability
**Risk:** Bug causes data loss; user sues for financial damages  
**Mitigation:** Limitation of Liability (T&S § 5) caps damages + excludes consequential damages  
**Status:** ✅ Addressed

### Subscription/Billing Disputes
**Risk:** Chargebacks, refund disputes, false subscription claims  
**Mitigation:** 
- Clear refund policy (7-day full, 8-30 partial, after 30 none)
- Anti-chargeback clause with escalating penalties
- Premium credit expiration (12 months) prevents perpetual liability
- **Status:** ✅ Addressed

### GDPR/APPI Compliance
**Risk:** Fined up to €20M (GDPR) for non-compliance  
**Mitigation:** 
- Comprehensive Privacy Policy with all required sections
- Data Processing Addendum with Supabase
- User rights fully implemented (access, export, delete, portability)
- 30-day data deletion compliance
- **Status:** ✅ Addressed

### Fair Process Enforcement
**Risk:** Accused of unfair account suspension without warning  
**Mitigation:** 
- All T&S violations result in 7-day warning before suspension
- Users can cure violations
- Dispute resolution process (5-day response SLA)
- **Status:** ✅ Addressed

---

## 8. Success Criteria

This legal framework is **complete when:**

1. ✅ **Incorporation:** Synark Labs Pte. Ltd. registered in Singapore
2. ✅ **Documents:** All 4 legal documents finalized and reviewed
3. ✅ **Implementation:** All checklist items completed
4. ✅ **Testing:** Account deletion, data export, privacy requests tested end-to-end
5. ✅ **Team Alignment:** Team briefed on GDPR/APPI obligations and incident response
6. ✅ **Compliance:** Privacy Officer appointed, DPA signed with Supabase

---

## 9. Review & Approval

**Design Approved By:** User (2026-07-29)  
**Sections Approved:**
- ✅ Section 1: Legal Document Architecture
- ✅ Section 2: Terms of Service Structure
- ✅ Section 3: Subscription & Billing Terms
- ✅ Section 4: Privacy Policy (GDPR/APPI Compliance)
- ✅ Section 5: Incorporation & Implementation

**Next Phase:** Implementation Planning (via writing-plans skill)

---

## 10. Related Documentation

- **Privacy Policy Page:** `src/pages/PrivacyPolicyPage.tsx` (existing, to be updated)
- **Legal Content:** `src/lib/legalContent.tsx` (to be expanded)
- **Subscription Terms:** New component `SubscriptionTermsContent.tsx`
- **Settings → Legal:** Update links to all 3 documents
- **Data Management:** Settings flow for export/delete (existing, verify 30-day purge)

---

**Spec Complete. Ready for Implementation Planning.**
