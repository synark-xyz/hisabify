---
created: 2026-03-22T00:00:00.000Z
title: Fix premium guard and implement RevenueCat for Android
area: ui
files:
  - src/components/PremiumGuard.tsx
  - src/features/referrals/
  - src/hooks/useSubscription.tsx
  - android/
---

## Problem

The premium popup/guard behavior needs fixing on the Android mobile app (not the web version). Additionally, RevenueCat needs to be integrated as the in-app purchase and subscription management platform for Android. Currently, the app may be using a web-based or placeholder subscription flow that doesn't work correctly in the native Capacitor Android build.

Issues to address:
- Premium popup/guard may show incorrectly or block content unexpectedly on Android
- No native in-app purchase flow — Stripe is planned for web but Android needs RevenueCat
- `PremiumGuard` and `useSubscription` may not account for native entitlement checks
- RevenueCat SDK needs to be installed via Capacitor plugin and initialized on app start

## Solution

1. Install `@revenuecat/purchases-capacitor` plugin
2. Initialize RevenueCat in the Android app lifecycle with the API key
3. Update `useSubscription` hook to check RevenueCat entitlements on native, fall back to Supabase on web
4. Fix `PremiumGuard` component to correctly gate features based on entitlement source
5. Handle purchase flow: `Purchases.purchasePackage()` for Android
6. Sync RevenueCat subscription status back to Supabase `users.subscription_type` via webhook or SDK listener
7. Test on real Android device — emulator may not support Play billing
