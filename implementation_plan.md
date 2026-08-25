# Interstitial ads (free Android users)

## Context

The banner layer already ships: `src/lib/ads.ts` holds the pure gate and unit-ID resolution,
`src/hooks/useAdBanner.ts` holds every side effect, and `initAdMob()` memoises the mandated
`initialize → requestConsentInfo → showConsentForm` order. Interstitials add a second format on
top of that foundation — no new SDK, no new consent flow, no new native config.

Decisions taken: fire **after a transaction is saved**, capped **conservatively** (every 3rd save,
≥3 min apart, ≤4/day, nothing in a user's first 2 days) — roughly 2–4 impressions/day for an
active user.

## Design

The banner's split is the template and is kept exactly: pure, testable decision in `lib/`,
all side effects in a hook, and **the call site is the placement policy**.

### 1. `src/lib/interstitial.ts` (new) — the pure cadence

Mirrors `src/lib/ratingPrompt.ts`, which already solves this shape of problem.

```ts
export interface InterstitialState {
  savesSinceLastAd: number;
  lastShownAt: number | null;
  shownOnDay: number;      // count within dayStamp
  dayStamp: string | null; // local YYYY-MM-DD, for the daily reset
  firstSeenAt: number | null;
}

export const SAVES_PER_AD = 3;
export const MIN_GAP_MS = 3 * 60_000;
export const MAX_PER_DAY = 4;
export const GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;

export function shouldShowInterstitial(state: InterstitialState, now: number): boolean;
export function recordShown(state, now): InterstitialState;   // resets counter, bumps daily tally
export function recordSave(state, now): InterstitialState;    // increments, stamps firstSeenAt
```

Day rollover uses a **local** date stamp, not `now - 24h`: a user logging expenses each evening
would otherwise be permanently one hour short of the reset.

### 2. `src/lib/ads.ts` — extend, don't fork

- `TEST_INTERSTITIAL_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712'` (Google's official
  interstitial test unit) and `getInterstitialUnitId()`, with the same
  "test unit unless `VITE_ADMOB_INTERSTITIAL_ID` is set *and* `import.meta.env.PROD`" fallback.
  That fallback is the account-suspension guard; it is not negotiable for the new format either.
- Extract the eligibility check as `shouldServeAds(gate)` — Android, signed in, subscription
  resolved, not premium — and keep `shouldShowBanner` as its existing export so
  `src/lib/__tests__/ads.test.ts` and `useAdBanner` are untouched.

### 3. `src/hooks/useInterstitialAd.ts` (new) — the side effects

- **Export `initAdMob()` from `useAdBanner.ts`** (currently module-private) and reuse it. Consent
  must not be requested twice, and the memoised promise is what guarantees that.
- Preload with `prepareInterstitial({ adId: getInterstitialUnitId() })` once after init, and again
  on the `Dismissed` event so the next one is warm.
- On `FailedToLoad`, do **not** retry in a loop — mark unavailable and let the next qualifying save
  try again. A retry loop against no-fill burns battery and looks like abuse to AdMob.
- Returns `recordTransactionSaved(): Promise<void>` — increments the counter, persists to
  Capacitor `Preferences` (per-user key, same pattern as `useAppRating`), consults
  `shouldShowInterstitial`, and calls `showInterstitial()` when it passes.
- Every path is caught and logged. A failed ad must never break a save — same rule as the banner.

### 4. Wire-up — one call site

`Layout.tsx` already has the hook point: `<AddTransactionModal onSuccess={() => {}} />` (line 172).

```tsx
onSuccess={() => { void interstitial.recordTransactionSaved(); }}
```

Layout-group only, exactly like the banner. Deliberately **not** wired to `EditTransactionModal`
(edits are mid-task, and rarer) or to the receipt/voice flows.

**Timing gotcha:** `onSuccess` fires while the bottom sheet is still animating closed, so a native
full-screen ad would slam over a half-closed sheet. Show on the sheet's close completion, not on
success — the simplest form is to defer the call by one animation frame plus the sheet's exit
duration, and that delay must be a named constant, not a magic `setTimeout(300)`.

### 5. Collisions

- **`RatingSheet`** fires at the same kind of moment and is also mounted in `Layout`. If
  `useAppRating().open` is true, or the rating sheet has already been shown this session, skip the
  interstitial. Two full-screen interruptions back-to-back is the single worst outcome here.
- **Banner** is unaffected — an interstitial is full-screen and transient, so `--ad-banner-h` and
  every layout offset that reads it stay untouched.

### 6. `.env.example`

Add `VITE_ADMOB_INTERSTITIAL_ID` beside the banner entry, with the same warning comment.

## Legal copy — required, not optional

`src/lib/legalContent.tsx` currently promises **"banner ads"** specifically, in four places
(≈ lines 148, 391, 432, 576). Shipping interstitials without changing that makes the privacy
policy inaccurate — the exact failure CLAUDE.md already records for this file ("It previously
promised the exact opposite").

- Reword to "banner and full-screen (interstitial) ads" in all four.
- Bump `LEGAL_LAST_UPDATED`.
- Play Console: "Contains ads" is already declared and the **data collected does not change**
  (same advertising identifier, same AdMob), so the Data safety form needs no edit — worth
  re-reading once to confirm rather than assuming.

## Not doing

- **iOS** — same blocker as the banner: ATT prompt, SKAdNetwork IDs, privacy manifest.
- **App Open ads** — a distinct format with its own policy. Interstitial-on-launch is the classic
  way to get an app flagged; the trigger here is deliberately a completed action instead.
- **Rewarded ads** — no feature to gate behind them yet.

## Verification

- `rtk proxy npx eslint src`, `npx vitest run`, `npm run build`, `npx cap sync android`.
  (Note `npx tsc --noEmit` checks nothing here — `tsconfig.json` is `"files": []` plus references.
  Use `-p tsconfig.app.json`, and expect ~291 pre-existing errors; only regressions matter.)
- New `src/lib/__tests__/interstitial.test.ts`: 3rd-save threshold, min-gap rejection, daily cap,
  local-midnight rollover, grace period for a new user, and that `recordShown` resets the counter.
- On-device with the **test** unit: save three transactions → ad appears; save three more within
  3 min → no ad; confirm the sheet is fully closed before the ad covers the screen; confirm a Pro
  account never sees one.
- Confirm `initAdMob()` still runs exactly once — add a temporary log and check the consent form
  is not requested twice on a fresh install.
