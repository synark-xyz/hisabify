# Roadmap — Hisabify

## v1.2 — Quality & Coverage (Current)

### Phase 1 — Fix Medium Complexity Issues from E2E_TEST_PLAN.md

**Goal:** Resolve 10 Medium complexity issues: architecture debt (OE-02, OE-03, OE-04, OE-06) and E2E test gaps (SPEC-01, SPEC-02, SPEC-03, SPEC-07, SPEC-08, SPEC-09).

**Depends on:** None.

**Success Criteria:**
- OE-02: Event bus removed; Supabase real-time is sole notification mechanism
- OE-03: Analytics consolidated into single useAnalytics hook
- OE-04: Spending calculations extracted to src/lib/budgetUtils.ts
- OE-06: ReceiptUpload lazy-loaded via React.lazy()
- SPEC-01: e2e/insights.spec.ts covers all 8 flows
- SPEC-02: e2e/settings.spec.ts covers all 7 flows
- SPEC-03: e2e/debts.spec.ts covers all 7 flows
- SPEC-07: e2e/premium.spec.ts covers all 6 flows
- SPEC-08: e2e/payment-reminders-create.spec.ts covers all 6 flows
- SPEC-09: e2e/navigation.spec.ts covers all 6 flows

---