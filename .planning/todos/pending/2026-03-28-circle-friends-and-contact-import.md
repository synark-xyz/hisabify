---
created: 2026-03-28T00:00:00.000Z
title: Circle — import friends and contacts from device
area: general
files:
  - src/features/referrals/components/ReferralCard.tsx
  - src/hooks/useAuth.tsx
  - android/app/src/main/AndroidManifest.xml
  - ios/App/App/Info.plist
---

## Problem

Social features (split expenses, joint budgets) require users to find friends inside the app. Without contact discovery, the friction to add friends is prohibitive — users would have to know and manually type usernames. "Circle" is the friends graph powering all social collaboration features.

## Solution

- **Contact import (privacy-first):** Request device contacts permission via `usePermissions()` (Capacitor Contacts plugin). Hash phone numbers locally with SHA-256 before sending to server. Server compares hashes against hashed phone numbers of registered users — returns only matched users. Raw contact data is never stored server-side
- **Friend requests:** Tap a matched contact to send a friend request. Recipient gets in-app notification to accept or decline. `user_friends` table: `user_id`, `friend_id`, `status` ('pending' | 'accepted' | 'declined'), `created_at`
- **Invite non-users:** One-tap SMS/WhatsApp deep-link invite for contacts not on Hisabify. Uses existing referral link so referrer earns coins when invitee signs up (see referral-system todo)
- **Circle UI:** Dedicated page or profile tab — friends list with avatars, "mutual friends" count, quick-action buttons (Request Split, Invite to Joint Budget)
- **Search fallback:** Manual search by Hisabify username or email for users who deny contact permission
- **Privacy controls:** User can disable contact matching in settings; matched contacts can block friend requests; user can remove friends from Circle at any time
- **Mobile permissions:**
  - Android: `READ_CONTACTS` in `AndroidManifest.xml`
  - iOS: `NSContactsUsageDescription` in `Info.plist`
  - Runtime: `ensurePermission('contacts')` before any contact read (add 'contacts' to `usePermissions` hook)
- **Web fallback:** Contact import disabled on web; only manual search and invite-by-link available
