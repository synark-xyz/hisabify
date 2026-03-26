---
created: 2026-03-27T00:00:00.000Z
title: Circle — import friends and contacts from device
area: general
files:
  - src/features/referrals/components/ReferralCard.tsx
  - src/hooks/useAuth.tsx
  - android/app/src/main/
  - ios/App/App/
---

## Problem

Social features (split expenses, joint budgets) require users to find and connect with friends inside the app. Without a contact discovery mechanism, the friction to add friends is too high. "Circle" is the friends graph that powers all social features.

## Solution

- **Contact import:** Request device contacts permission (iOS/Android via Capacitor); hash phone numbers locally before sending to server for privacy-preserving matching
- **Friend matching:** Compare hashed contacts against hashed user phone numbers in DB — surface which contacts are already on Hisabify
- **Friend requests:** Send in-app friend request; recipient accepts/declines
- **Invite non-users:** One-tap SMS/WhatsApp invite to contacts not yet on Hisabify (feeds referral system)
- **Circle UI:** Friends list with avatars, mutual connections count, and quick-action buttons (split, joint budget, invite)
- **Privacy:** Never store raw contact data; only hashed phone numbers used for matching; user can revoke at any time
- **Permissions:** Use `usePermissions()` hook for contacts access; handle denial gracefully with manual search fallback
- **Search fallback:** Manual search by username or email for users who deny contact access
- **Mobile permissions:**
  - Android: `READ_CONTACTS`
  - iOS: `NSContactsUsageDescription`
