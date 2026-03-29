---
created: 2026-03-27T00:00:00.000Z
title: Referral system update with coin rewards and benefits
area: general
files: []
---

## Problem

The existing referral system gives users a one-time credit but lacks ongoing engagement. Users have no recurring incentive to invite friends, and the reward model is opaque. Need to overhaul referrals to feed into the new coin economy.

## Solution

- Rework referral flow: referrer earns coins when a referred user signs up AND when they complete key actions (first transaction, first budget, etc.)
- Milestone-based referral bonuses (e.g., 5 referrals = bonus coin pack)
- Referral dashboard showing pending/earned coins, referral count, and leaderboard position
- Deep-link shareable referral URLs with UTM tracking
- Backend: update `reward_referral()` RPC to credit coins instead of flat credit
