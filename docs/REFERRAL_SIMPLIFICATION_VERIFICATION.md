# Referral System Simplification - Verification Checklist

## Overview
This document outlines the verification steps for the referral system simplification implemented on 2026-03-11.

**Changes Summary:**
- Replaced lifetime credit accumulation with time-based Pro grants (30 days per referral)
- Updated referral codes from 6-char MD5 to 8-char UUID substring
- Created atomic `redeem_referral_code()` RPC (single transaction)
- Simplified UI from gradient card + separate sections to single card with tab toggle
- Reduced client code complexity by ~60%

---

## Pre-Migration Verification

### 1. Backup Existing Data
```sql
-- Backup users table before migration
CREATE TABLE users_backup_20260311 AS SELECT * FROM users;

-- Verify backup
SELECT COUNT(*) FROM users_backup_20260311;
```

### 2. Document Current State
```sql
-- Count users with referral credits
SELECT COUNT(*) FROM users WHERE referral_credits > 0;

-- List top referrers
SELECT user_id, referral_code, referral_credits, referred_by
FROM users
WHERE referral_credits > 0
ORDER BY referral_credits DESC
LIMIT 10;
```

---

## Migration Execution

### 1. Run Migration
```bash
# Apply the migration to Supabase
# Either through Supabase dashboard or CLI
supabase migration up --file 20260311000000_simplify_referrals.sql
```

### 2. Verify Schema Changes
```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('referral_used_at', 'referral_granted_until');

-- Check old functions are dropped
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('reward_referral', 'generate_referral_code');
-- Should return 0 rows

-- Check new function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'redeem_referral_code';
-- Should return 1 row
```

### 3. Verify Data Migration
```sql
-- Check users with credits now have granted_until dates
SELECT
  user_id,
  referral_credits,
  referral_granted_until,
  EXTRACT(DAY FROM (referral_granted_until - now())) as days_remaining
FROM users
WHERE referral_credits > 0
LIMIT 10;

-- Verify referral codes updated to 8-char format
SELECT user_id, referral_code, LENGTH(referral_code) as code_length
FROM users
WHERE referral_code IS NOT NULL
LIMIT 10;
-- All code_length should be 8
```

---

## Frontend Verification

### 1. Build and Type Check
```bash
# Ensure no TypeScript errors
npm run build

# Run linter
npm run lint
```

### 2. Test Referral Hook (`useReferral.ts`)
- [ ] Hook returns `referralCode` (8 chars)
- [ ] Hook returns `daysRemaining` (number)
- [ ] Hook returns `hasUsedReferral` (boolean)
- [ ] `redeemCode()` calls `redeem_referral_code` RPC
- [ ] Toast messages display correctly on success/error

### 3. Test Subscription Hook (`useSubscription.tsx`)
- [ ] `isPremium` returns `true` for users with active subscription
- [ ] `isPremium` returns `true` for users with valid `referral_granted_until`
- [ ] `isPremium` returns `false` for users with expired `referral_granted_until`
- [ ] Special user override still works (sam103043@gmail.com)

### 4. Test Referral Card UI (`ReferralCard.tsx`)
- [ ] Card displays tab toggle (Share Code | Redeem Code)
- [ ] Share tab shows 8-char referral code
- [ ] Copy button works (clipboard + toast)
- [ ] Share button works (native share API or fallback to copy)
- [ ] "X days Pro remaining" badge displays when `daysRemaining > 0`
- [ ] Redeem tab shows input field and button
- [ ] Redeem input enforces 8-char max length
- [ ] Redeem button disabled if input < 8 chars
- [ ] Redeem tab disables after successful redemption
- [ ] Error messages display correctly (invalid code, self-referral, already used)

### 5. Test Profile Page (`ProfilePage.tsx`)
- [ ] PRO badge shows for premium users (subscription or referral grant)
- [ ] Upgrade modal only shows for non-premium users
- [ ] No console errors related to `referral_credits`

---

## Functional Testing

### Test Case 1: New User Redemption (Happy Path)
**Steps:**
1. Create new test user (User A)
2. Verify User A has 8-char referral code
3. Create another test user (User B)
4. User B navigates to Referrals page
5. User B enters User A's code in "Redeem Code" tab
6. User B clicks "Redeem"

**Expected:**
- Success toast: "Referral code redeemed! You both get 30 days of Pro features."
- User B's `referred_by` = User A's ID
- User B's `referral_used_at` = now
- User B's `referral_granted_until` = now + 30 days
- User A's `referral_granted_until` = now + 30 days (or extended if already exists)
- User B sees "X days Pro remaining" badge
- User B's redeem tab is now disabled
- User B can access Pro features (test with PremiumGuard)

### Test Case 2: Self-Referral Prevention
**Steps:**
1. User A tries to redeem their own code

**Expected:**
- Error toast: "You cannot use your own referral code"
- No changes to database

### Test Case 3: Duplicate Redemption Prevention
**Steps:**
1. User B (already redeemed a code) tries to redeem another code

**Expected:**
- Error toast: "You have already redeemed a referral code"
- Redeem tab shows: "You have already redeemed a referral code."
- Redeem input/button disabled

### Test Case 4: Invalid Code
**Steps:**
1. New user enters invalid 8-char code (e.g., "INVALID1")
2. Click "Redeem"

**Expected:**
- Error toast: "Invalid referral code"
- No changes to database

### Test Case 5: Referral Stacking (Multiple Invites)
**Steps:**
1. User A refers User B (redemption successful)
2. Wait a moment
3. User A refers User C (redemption successful)

**Expected:**
- After first redemption: User A has 30 days Pro
- After second redemption: User A has 60 days Pro (stacked)
- Query to verify:
  ```sql
  SELECT
    user_id,
    referral_granted_until,
    EXTRACT(DAY FROM (referral_granted_until - now())) as days_remaining
  FROM users
  WHERE user_id = '<User A ID>';
  ```

### Test Case 6: Pro Access Expiry
**Steps:**
1. Manually set a user's `referral_granted_until` to past date:
   ```sql
   UPDATE users
   SET referral_granted_until = now() - INTERVAL '1 day'
   WHERE user_id = '<test_user_id>';
   ```
2. Reload app and check Pro status

**Expected:**
- `isPremium` returns `false`
- User cannot access Pro features
- PRO badge does not show
- Upgrade modal shows on Profile page

### Test Case 7: Migrated Credit Users
**Steps:**
1. Find a user who had `referral_credits = 2` before migration
2. Check their `referral_granted_until`

**Expected:**
- `referral_granted_until` ≈ now + 60 days (2 * 30)
- User still has Pro access
- "X days Pro remaining" badge shows correct value

---

## Edge Case Testing

### Edge Case 1: Empty Referral Code Input
- [ ] Redeem button disabled when input is empty
- [ ] No API call made

### Edge Case 2: Partial Code Input (< 8 chars)
- [ ] Redeem button disabled
- [ ] Input allows typing but button stays disabled

### Edge Case 3: Code with Special Characters
- [ ] Input converts to uppercase
- [ ] Invalid code handled gracefully (server returns error)

### Edge Case 4: Concurrent Redemptions
**Setup:** Two users try to redeem the same referrer's code simultaneously

**Expected:**
- Both succeed (no collision)
- Referrer's Pro time extends correctly (60 days total)

### Edge Case 5: Referrer with Active Paid Subscription
**Setup:** User A has paid Pro subscription + receives referral reward

**Expected:**
- `isPremium` remains `true` (paid subscription takes precedence)
- `referral_granted_until` still updates (for after subscription expires)

---

## Performance Verification

### 1. RPC Function Performance
```sql
-- Test RPC execution time
EXPLAIN ANALYZE
SELECT redeem_referral_code('TESTCODE', '123e4567-e89b-12d3-a456-426614174000');
```

**Expected:** Execution time < 100ms

### 2. Premium Check Performance
```sql
-- Test query performance for isPremium logic
EXPLAIN ANALYZE
SELECT user_id,
       (subscription_type = 'pro' AND subscription_status = 'active')
       OR (referral_granted_until > now())
       AS is_premium
FROM users
WHERE user_id = '<test_user_id>';
```

**Expected:** Uses index, execution time < 10ms

---

## Rollback Plan

If issues are found, rollback steps:

### 1. Revert Database
```sql
-- Restore old functions
CREATE OR REPLACE FUNCTION public.generate_referral_code() ...
CREATE OR REPLACE FUNCTION public.reward_referral(...) ...

-- Drop new function
DROP FUNCTION IF EXISTS public.redeem_referral_code(TEXT, UUID);

-- Restore from backup (if needed)
-- WARNING: This will lose any new data created after migration
TRUNCATE users;
INSERT INTO users SELECT * FROM users_backup_20260311;
```

### 2. Revert Frontend Code
```bash
git revert <commit-hash>
npm run build
# Redeploy
```

---

## Post-Deployment Monitoring

### Day 1-3 Checklist
- [ ] Monitor Sentry/logs for errors related to `redeem_referral_code`
- [ ] Check analytics: referral redemption success rate
- [ ] Verify no complaints about missing credits/Pro access
- [ ] Monitor database performance (query times)

### Week 1 Checklist
- [ ] Verify users with expiring grants lose Pro access correctly
- [ ] Check if any users report issues with referral codes
- [ ] Confirm no database integrity issues

### Cleanup (After 1 Week)
If no issues detected:
```sql
-- Drop old referral_credits column
ALTER TABLE users DROP COLUMN IF EXISTS referral_credits;

-- Drop backup table
DROP TABLE IF EXISTS users_backup_20260311;
```

---

## Success Criteria

✅ All tests pass without errors
✅ No TypeScript compilation errors
✅ E2E tests pass (if applicable)
✅ Users can redeem codes and receive Pro access
✅ Referrers receive stacking Pro grants
✅ Edge cases handled gracefully
✅ Performance within acceptable limits
✅ No production errors for 1 week

---

## Rollout Strategy

### Option 1: Direct Deploy (Recommended for small user base)
1. Run migration
2. Deploy frontend
3. Monitor for 24-48 hours

### Option 2: Phased Rollout (For larger user base)
1. Deploy migration to staging environment
2. Run full test suite
3. Deploy to production during low-traffic period
4. Monitor closely for first 24 hours
5. If issues: rollback immediately
6. If stable: announce feature improvements

---

## Contact & Support

**Migration Date:** 2026-03-11
**Developer:** Claude Code
**Documentation:** This file + plan in `/Users/sadat.sayem/.claude/projects/.../c5d8514f-3d2d-4941-9144-464f877d4b23.jsonl`

For issues, check:
1. Browser console errors
2. Network tab (failed API calls)
3. Supabase logs (RPC errors)
4. TypeScript errors (`npm run build`)
