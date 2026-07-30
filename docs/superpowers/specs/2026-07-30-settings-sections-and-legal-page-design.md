# Settings Sections & Consolidated Legal Page — Design

**Date:** 2026-07-30
**Branch:** `feat/legal-docs`
**Status:** Approved, ready for implementation planning

## Problem

`src/pages/SettingsPage.tsx` groups its rows into two sections, `General` (3 rows) and
`Support` (7 rows). The Support section is not a support section: three of its seven rows
are legal documents (Privacy Policy, Terms, Subscription Terms) sitting alongside Help,
Feedback, Rate, and FAQ. Ten near-identical rows under two headings, one of which is
mislabelled.

The three legal documents are also presented three different ways:

| Document | Presentation | Route |
|---|---|---|
| Privacy Policy | Full page | `/privacy` |
| Subscription Terms | Full page | `/subscription-terms` |
| Terms of Service | Tabbed modal, with Privacy duplicated as its second tab | none |

Terms of Service is the only one of the three with no URL. It opens `LegalModal` with
`defaultTab="terms"`, and that modal's second tab renders the Privacy Policy a second time.

Separately, `PrivacyPolicyPage.tsx` wraps its content in a fixed-height `ScrollArea`, which
is a layout defect on mobile (detailed in "Privacy Policy page" below).

## Goals

1. Regroup the Settings sections so each heading describes its contents.
2. Give Terms of Service a real route, and put it on one scrollable, sectioned page
   together with Subscription & Billing.
3. Fix the `ScrollArea` defect on the Privacy Policy page.

## Non-goals

Explicitly out of scope, having been considered and set aside:

- **No visual redesign.** Row anatomy, icon chips, per-row colours, card treatment, section
  header styling, and spacing all stay exactly as they are. Rows move between sections;
  they do not change appearance.
- **No navigation restructuring.** `/profile`, `/settings`, and `/more` remain three
  separate pages with their existing entry points. The header avatar still goes to
  `/profile`; the header dropdown still goes to `/settings`. None of those three redirects
  to another, and the bottom nav is unchanged. (The one redirect this work does add,
  `/subscription-terms` → `/terms`, is between two legal-document routes and does not touch
  these three pages.)
- **No merging of Settings and Profile.** The `Data & Privacy` row appearing in both
  Settings and Profile is left alone.
- **Privacy Policy is not merged into the Terms page.** Play Console Data Safety and App
  Store Connect both require a URL whose page *is* the privacy policy. It stays standalone
  at `/privacy`.

## Design

### Settings sections

Three sections replace two. Every retained row keeps its current icon, colour, and target —
rows move between sections but are otherwise untouched.

```
GENERAL                          (unchanged)
  Preferences          → /settings/preferences
  Notifications        → /settings/notifications
  Data & Privacy       → /profile/data

SUPPORT                          (7 rows → 4, self-serve first)
  FAQ                  → /faq
  Help Center          → /support
  Send Feedback        → FeedbackSheet
  Rate the App         → openStoreListing()

LEGAL                            (new)
  Terms & Conditions   → /terms
  Privacy Policy       → /privacy

[ Sign Out ]     <version>
```

Sign Out and the version line below it are unchanged; the version string is still read from
the native build via `getAppVersion()`.

Support is ordered as an escalation ladder: self-serve answers (FAQ), then contact
(Help Center), then unsolicited input (Feedback, Rate).

`Rate the App` is not strictly support, but a dedicated section for a single row is not
worth the heading. It sits last in Support, which is where store-listing links conventionally
appear.

The `subscriptionTerms` row is removed; its content now lives on the Terms page. Its
`CreditCard` icon import goes with it.

`LegalModal`, its `showTerms` state, and its import all leave `SettingsPage`. The component
itself is **not** changed or deleted — `AuthPage` still uses it at signup, where a modal is
correct because the user must not navigate away mid-registration.

### Shared legal page shell

`PrivacyPolicyPage.tsx` (23 lines) and `SubscriptionTermsPage.tsx` (29 lines) are the same
page differing only in title and content component. One shell replaces both:

```tsx
// src/components/LegalDocPage.tsx
interface LegalDocPageProps {
  title: string;
  children: React.ReactNode;
}

export function LegalDocPage({ title, children }: LegalDocPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background pb-page-content">
      <Header title={title} showBack onBack={() => navigate(user ? '/settings' : '/auth')} />
      <main className="px-4 py-6 space-y-6">
        {children}
        <p className="text-[10px] text-muted-foreground pt-4 text-center">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
      </main>
    </div>
  );
}
```

The `user ? '/settings' : '/auth'` back target is existing behaviour from both pages, moved
verbatim. It matters because these routes are public (see "Routing" below) and a signed-out
visitor has no Settings page to return to.

### Terms page

```tsx
// src/pages/TermsPage.tsx
<LegalDocPage title={t('page.termsConditions')}>
  <h2 className="text-base font-black text-foreground">Terms of Service</h2>
  <TermsContent />
  <h2 className="text-base font-black text-foreground pt-2 border-t border-border/50">
    Subscription &amp; Billing
  </h2>
  <SubscriptionTermsContent />
</LegalDocPage>
```

Group headings are required because each document restarts its section numbering at 1 —
`TermsContent` runs 1–12, `SubscriptionTermsContent` runs 1–11. Without headings the page
reads as a single document that counts to twelve and then starts over.

The headings are hardcoded English, not `t()` calls. This is deliberate and consistent:
the entire body of `legalContent.tsx` and `SubscriptionTermsContent.tsx` is hardcoded
English. Only the page *title* is translated, which matches how `/privacy` already
behaves.

Plain native page scroll, no `ScrollArea`, no accordion. 23 sections is long but it is a
legal document; readers scroll or use browser find.

### "Last updated" ownership

`LEGAL_LAST_UPDATED` is currently rendered as a trailing line inside `TermsContent`
(`legalContent.tsx:208`) and `PrivacyContent` (`legalContent.tsx:599`).
`SubscriptionTermsContent` has no such line.

Rendering both documents on one page would print the line twice. The line moves out of the
content components and into `LegalDocPage`, which is the correct owner — document metadata
belongs to the shell, not the body.

This affects three call sites:

- `TermsPage` and `PrivacyPolicyPage` — get the line from `LegalDocPage`. No action.
- `LegalModal` — loses the line and must render it itself, once, below the `Tabs` block so
  it applies to whichever tab is active.

### Privacy Policy page

The content is current and correct: 14 sections, GDPR and APPI coverage, correct use of
`LEGAL_CONTACT_EMAIL` throughout. Two placeholders are deliberate and stay, because they
track `docs/legal/INCORPORATION_CHECKLIST.md`:

- "Data Protection Officer: To be appointed after Singapore incorporation and listed here."
- "EU Representative: To be appointed if significant EU user base develops."

The page wrapper has a real defect:

```tsx
<div className="min-h-screen bg-background pb-page-content">
  <Header ... />
  <main className="px-4 py-6">
    <ScrollArea className="h-[calc(100vh-140px)] pr-4">
```

`140px` is a hardcoded guess at header height, but `Header` is sticky with
`paddingTop: calc(env(safe-area-inset-top) + 8px)` — variable per device. On a notched
phone the header runs roughly 100px, so the scroll box bottom lands near `100vh − 16px`
and the closing sections sit below the fold with no page scroll behind them to recover,
because the outer div is exactly `100vh`. On a non-notched screen the same arithmetic
leaves roughly 56px of dead space.

Three further problems compound it:

- Nested scroll containers cost iOS momentum scrolling and interfere with pull-to-refresh.
- `pr-4` reserves a gutter for a scrollbar that mobile never draws.
- The outer `pb-page-content` is inert, because the outer div never scrolls.

Fix: delete the `ScrollArea` and let the page scroll natively, which `LegalDocPage` already
does. `PrivacyPolicyPage` becomes a thin wrapper:

```tsx
export function PrivacyPolicyPage() {
  const { t } = useTranslation();
  return (
    <LegalDocPage title={t('page.privacyPolicy')}>
      <PrivacyContent />
    </LegalDocPage>
  );
}
```

The identical defect in `SubscriptionTermsPage` needs no separate fix; that file is deleted.

### Routing

`/terms` is **public** — outside `StandalonePage`/`ProtectedRoute` — matching how `/privacy`
and `/subscription-terms` are already declared in `App.tsx`. This is deliberate: store
listings, the signup screen, and external reviewers must reach these documents without a
session.

`/subscription-terms` is kept as a redirect rather than deleted:

```tsx
<Route path="/terms" element={<TermsPage />} />
<Route path="/subscription-terms" element={<Navigate to="/terms" replace />} />
```

Three things reference that path today: `SettingsPage.tsx:48` (removed by this work),
`DataPage.tsx:95` (repointed to `/terms`), and
`docs/legal/PRE_LAUNCH_CHECKLIST.md:55`. An app store listing may reference it as well,
and a live external link must not start 404-ing.

`Header.getClosePagePath` needs no change. It special-cases `/privacy`, `/faq`, and
`/support`, but `LegalDocPage` always passes an explicit `onBack`, which short-circuits that
lookup — the same reason `/subscription-terms` works today without appearing in the list.

## Files

| File | Change |
|---|---|
| `src/pages/SettingsPage.tsx` | three section arrays; drop `LegalModal`, `showTerms`, `CreditCard` |
| `src/components/LegalDocPage.tsx` | **new** — shared shell |
| `src/pages/TermsPage.tsx` | **new** — ToS + Subscription & Billing |
| `src/pages/PrivacyPolicyPage.tsx` | rewrite onto shell; removes `ScrollArea` |
| `src/pages/SubscriptionTermsPage.tsx` | **delete** |
| `src/lib/legalContent.tsx` | remove trailing "Last updated" from `TermsContent` and `PrivacyContent` |
| `src/components/LegalModal.tsx` | render "Last updated" once, below `Tabs` |
| `src/App.tsx` | add public `/terms`; `/subscription-terms` → `Navigate`; drop `SubscriptionTermsPage` lazy import |
| `src/pages/profile/DataPage.tsx` | line 95 privacy-links list → `/terms` |
| `src/i18n/locales/{en,ja,bn}/translation.json` | add `page.termsConditions`, `settingsPage.legal` |
| `CLAUDE.md` | ToS now has a route; correct the "don't link `/terms`, it 404s" note |
| `docs/legal/PRE_LAUNCH_CHECKLIST.md` | update the `/subscription-terms` checklist item |

`docs/` is gitignored (`.gitignore:50`); doc changes need `git add -f`, matching how the
existing specs were committed.

### New i18n keys

| Key | en | Notes |
|---|---|---|
| `page.termsConditions` | `Terms & Conditions` | existing `auth.terms` is `"Terms"` — too terse for a row label and already used at signup |
| `settingsPage.legal` | `Legal` | section heading, matching `settingsPage.general` / `settingsPage.support` |

Both need ja and bn values in the same commit. Existing keys are reused everywhere else:
`common.helpSupport`, `page.faq`, `feedback.title`, `rating.rateTheApp`,
`page.privacyPolicy`.

## Verification

This work is presentational — list regrouping and a page shell. The only logic is the
`onBack` target, which is existing behaviour relocated verbatim. No new unit tests are
proposed; there is no branching logic that a test would meaningfully protect.

- `npm run lint` passes.
- `npm test` passes (existing suite; no tests touch these files).
- Manual: Settings shows three sections with the rows listed above, in that order.
- Manual: each of the six rows reaches its target.
- Manual: `/terms` renders both documents under their group headings, scrolls natively to
  the end, and shows "Last updated" exactly once.
- Manual: `/privacy` scrolls to the last section — section 14, "Contact & Privacy Officer" —
  with no clipping and no inner scrollbar. Check on a notched viewport, since that is where
  the old `100vh − 140px` box failed.
- Manual: `/subscription-terms` redirects to `/terms`.
- Manual: signed out, `/terms` and `/privacy` both load, and back goes to `/auth`.
- Manual: signup screen's Terms and Privacy links still open `LegalModal` with both tabs
  working and one "Last updated" line.

## Open questions

None.
