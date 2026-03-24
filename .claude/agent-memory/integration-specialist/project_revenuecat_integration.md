---
name: RevenueCat integration — Android in-app purchases
description: RevenueCat replaced Stripe for Android subscription purchases. Records auth strategy, file locations, env vars, and Play Store package identifiers.
type: project
---

Stripe was removed and replaced with RevenueCat (`@revenuecat/purchases-capacitor`) for Android in-app purchases.

**Why:** Capacitor 8 Android app requires native in-app billing via Google Play. Stripe Checkout (web redirect) is not acceptable on Android per Play Store policy.

**How to apply:** Any future subscription or billing work should go through RevenueCat. Do not reintroduce Stripe client calls.

## Files

| File | Role |
|------|------|
| `src/hooks/useRevenueCat.ts` | Core plugin wrapper — configure, purchasePackage, getOfferings, restorePurchases, isPremium |
| `src/hooks/useSubscription.tsx` | Domain hook — maps 'monthly'/'yearly' to RC packages, wraps useRevenueCat, exposes purchasePlan + backward-compat createCheckoutSession alias |
| `src/components/UpgradeModal.tsx` | Calls purchasePlan and restorePurchases from useSubscription |
| `supabase/functions/revenuecat-webhook/index.ts` | Deno Edge Function — verifies Authorization header, maps RC events to Supabase subscription_type/status updates |
| `android/app/build.gradle` | Declares `com.revenuecat.purchases:purchases:7.+` and `purchases-ui:7.+` native deps |

## Deleted files
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`

## Auth / verification
- RevenueCat webhook uses a plain shared-secret `Authorization` header (not HMAC). Stored in Supabase secret `REVENUECAT_WEBHOOK_AUTH_HEADER`.
- Plugin configured on mount with `user.id` as `appUserID` so RevenueCat records map directly to Supabase UUIDs.

## Package identifiers (Play Store)
- Monthly: packageType `MONTHLY` — RC identifier `$rc_monthly`
- Annual: packageType `ANNUAL` — RC identifier `$rc_annual`
- useSubscription looks up by `packageType` first, falls back to identifier string.

## Environment variables
- `VITE_REVENUECAT_API_KEY` — RevenueCat Android public API key (client, non-secret)
- `REVENUECAT_WEBHOOK_AUTH_HEADER` — Supabase secret, must match the Authorization value configured in RevenueCat dashboard → Integrations → Webhooks

## isPremium logic (unchanged)
`subscription_type === 'pro' && subscription_status === 'active'` OR active referral grant OR `sam103043@gmail.com` special-user override.
