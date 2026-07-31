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
