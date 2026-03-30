---
created: 2026-03-28T00:00:00.000Z
title: Referral system update with coin rewards and benefits
area: general
files:
  - src/features/referrals/components/ReferralCard.tsx
  - src/hooks/useAuth.tsx
  - supabase/migrations/
---

## Problem

The existing referral system gives a one-time flat credit when a friend signs up but lacks ongoing engagement mechanics. Users have no recurring incentive to invite friends, the reward is opaque, and there is no way to track referral impact. The referral system needs to feed into the new coin economy (see coin-system todo) rather than issuing ad-hoc credits.

## Solution

- **Tiered rewards:** Referrer earns coins on friend sign-up, on friend's first transaction, and on friend's first budget creation (multi-event reward chain)
- **Milestone bonuses:** Hitting 5/10/25 total referrals triggers a bonus coin pack (e.g., 500/1500/5000 coins)
- **Referral dashboard:** Shows total referrals, pending/earned coins, referral link, and a mini leaderboard (rank among all users)
- **Deep-link shareable URLs:** `/invite/{referral_code}` with UTM params so attribution is trackable in analytics
- **Backend:** Update `reward_referral()` RPC to credit coins instead of flat credit; add `referral_events` table to track which events have been rewarded per referee to prevent double-crediting
- **Profile page:** Replace static referral code display with the new dashboard card
- **Existing `referral_granted_until`** on users table remains for backward compatibility with time-based referral grants
