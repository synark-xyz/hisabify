# Quick Start Testing Guide

## 🚀 Start Testing in 5 Minutes!

This guide helps you quickly test Phase 1 & 2 implementations.

---

## Prerequisites

✅ Dev server running
✅ Modern browser (Chrome/Safari/Edge recommended)
✅ Microphone access (for voice testing)

---

## Step 1: Start Dev Server (30 seconds)

```bash
# Make sure you're in the project directory
cd /Users/sadat.sayem/Biz/contributions/hisabify

# Start the dev server
npm run dev

# Wait for output like:
# ➜  Local:   http://localhost:8101/
# ➜  Network: http://192.168.x.x:8101/
```

**Open in browser:** http://localhost:8101/ (or the URL shown in terminal)

---

## Step 2: Test Phase 1 - Unified FAB (2 minutes)

### Test 2.1: FAB Visibility
1. ✅ Look at bottom navigation bar
2. ✅ Verify Plus button is in the center
3. ✅ Button should be circular with orange/accent background

### Test 2.2: Open InputMethodSheet
1. Click/tap the Plus button (FAB)
2. ✅ Bottom sheet slides up from bottom
3. ✅ Sheet shows title: "Choose Input Method"
4. ✅ Three cards visible:
   - Voice (microphone icon)
   - Scan (camera icon)
   - Manual (edit icon)

### Test 2.3: Voice Card Navigation
1. In InputMethodSheet, click "Voice" card
2. ✅ Sheet closes
3. ✅ VoiceInputFlow modal opens (centered)
4. ✅ Large microphone button visible
5. ✅ Title: "Voice Input" at top

### Test 2.4: Close and Reopen
1. Click X button or click outside modal
2. ✅ Modal closes
3. Click FAB again
4. Click "Scan" card
5. ✅ NexusModal opens in Scan mode (receipt upload UI)

### Test 2.5: Manual Entry
1. Click FAB again
2. Click "Manual" card
3. ✅ AddTransactionModal opens (transaction form)
4. ✅ Form fields visible: Amount, Merchant, Category, etc.

**Phase 1 Basic Test Complete! ✅**

---

## Step 3: Test Phase 2 - Voice Input (3 minutes)

### Test 3.1: Open Voice Input
1. Click unified FAB
2. Click "Voice" card
3. ✅ VoiceInputFlow opens

### Test 3.2: Permission Prompt (First Time)
1. Click the large microphone button
2. ✅ Browser shows permission prompt at top/bottom:
   - Chrome: "localhost wants to use your microphone"
   - Safari: Similar prompt
3. Click "Allow"

### Test 3.3: Recording State
1. After allowing permission, click mic button again
2. ✅ Button background turns red
3. ✅ Pulsing circles appear (2 concentric circles)
4. ✅ "Recording..." badge appears below button
5. ✅ Red dot animates with pulse

### Test 3.4: Voice Transcription
1. While recording, say clearly:
   > "Starbucks twenty five dollars"

2. ✅ Watch transcript appear in real-time below mic button
3. ✅ Text updates as you speak
4. ✅ Should show something like: "starbucks twenty five dollars"

### Test 3.5: Stop Recording
1. Click the microphone button again
2. ✅ Recording stops (button returns to orange)
3. ✅ Pulsing animation stops
4. ✅ "Recording..." badge disappears
5. ✅ Transcript remains visible

### Test 3.6: Parsing Results
1. Look at the result section below transcript
2. ✅ Should show green checkmark icon
3. ✅ Should show "Extracted:"
4. ✅ Should display:
   - Merchant: "Starbucks" (or similar)
   - Amount: "$25.00" (in green, bold)

### Test 3.7: Use Parsed Data
1. ✅ "Use This" button should be enabled (not grayed out)
2. Click "Use This" button
3. ✅ VoiceInputFlow closes
4. ✅ AddTransactionModal opens
5. ✅ Merchant field pre-filled: "Starbucks"
6. ✅ Amount field pre-filled: "25.00"

**Phase 2 Basic Test Complete! ✅**

---

## Step 4: Test Edge Cases (Optional, 2 minutes)

### Test 4.1: Parsing Failure
1. Open Voice Input
2. Record: "Hello this is just a test"
3. Stop recording
4. ✅ Orange warning icon appears
5. ✅ Message: "Could not extract merchant or amount"
6. ✅ "Use This" button is disabled (grayed out)

### Test 4.2: Try Again
1. After a failed recording, click "Try Again"
2. ✅ Page reloads (currently expected behavior)
3. ✅ VoiceInputFlow opens fresh
4. ✅ Can record again

### Test 4.3: Permission Denied
1. In browser, revoke microphone permission:
   - Chrome: Click lock icon in address bar > Site Settings > Microphone > Block
   - Safari: Safari > Settings for This Website > Microphone > Deny
2. Open Voice Input
3. ✅ Shows error state with crossed-out mic icon
4. ✅ Error message: "Microphone Access Denied"
5. ✅ Instructions to enable in settings

---

## Step 5: Test Multiple Inputs (Optional, 3 minutes)

Try different voice inputs and verify parsing:

| Say This | Expected Merchant | Expected Amount |
|----------|-------------------|-----------------|
| "Coffee shop $15" | Coffee shop | $15.00 |
| "Taxi twenty dollars" | Taxi | $20.00 |
| "Grocery 50" | Grocery | $50.00 |
| "McDonald's fifteen fifty" | McDonald's | $15.50 (varies) |

**Notes:**
- Parsing accuracy: ~70-80% (acceptable for Phase 2)
- Some variations may not parse perfectly
- Users can manually edit in transaction form

---

## Common Issues & Solutions

### Issue: "Microphone permission prompt doesn't appear"

**Solution:**
1. Check if you previously denied permission
2. Go to browser site settings
3. Reset microphone permission to "Ask" or "Allow"
4. Reload page and try again

---

### Issue: "No transcript appears when speaking"

**Possible causes:**
1. Microphone not working/connected
2. Browser doesn't support Web Speech API
3. Microphone permission denied

**Solution:**
1. Check microphone works in other apps
2. Try Chrome or Safari (best support)
3. Check browser console for errors (F12 → Console)

---

### Issue: "Parsing doesn't extract data correctly"

**Expected behavior:**
- Client-side parsing is ~70-80% accurate
- Works best with simple patterns: "merchant amount"
- Example: "Starbucks $25"

**Workaround:**
- User can manually edit in transaction form
- AI parsing (95%+ accuracy) planned for Phase 8

---

### Issue: "Animations are stuttering/slow"

**Solution:**
1. Close other browser tabs
2. Check CPU usage (Activity Monitor/Task Manager)
3. Try Chrome (best performance)
4. Disable browser extensions temporarily

---

## Quick Test Checklist

**Phase 1 (Unified FAB):**
- [ ] FAB visible in bottom nav
- [ ] FAB opens InputMethodSheet
- [ ] Sheet shows 3 cards
- [ ] Voice card opens VoiceInputFlow
- [ ] Scan card opens NexusModal (scan mode)
- [ ] Manual card opens AddTransactionModal
- [ ] Sheet closes on backdrop click
- [ ] Animations smooth

**Phase 2 (Voice Input):**
- [ ] VoiceInputFlow opens
- [ ] Permission prompt appears (first time)
- [ ] Microphone button works (start/stop)
- [ ] Recording state shows (red, pulsing)
- [ ] Transcript updates in real-time
- [ ] Parsing extracts merchant/amount
- [ ] "Use This" pre-fills transaction form
- [ ] Error states handled gracefully

---

## What to Report

If you find issues, note:
1. **What:** What didn't work as expected
2. **Where:** Which test case (e.g., "Test 3.4")
3. **Browser:** Chrome 120, Safari 17, etc.
4. **Input:** What you said (for voice tests)
5. **Expected:** What should happen
6. **Actual:** What actually happened
7. **Screenshot:** If visual bug

**Example:**
```
Test: 3.6 - Parsing Results
Browser: Chrome 120
Input: "Starbucks twenty five dollars"
Expected: Merchant: "Starbucks", Amount: "$25.00"
Actual: Merchant: "Starbucks twenty", Amount: undefined
Issue: Amount not extracted
```

---

## Next Steps

After testing Phase 1 & 2:

1. ✅ **If all tests pass:**
   - Report "Phase 1 & 2 tested successfully"
   - Ready to proceed to Phase 3 (Receipt Image Optimization)

2. ⚠️ **If issues found:**
   - Report issues using format above
   - We'll fix before proceeding

3. 📱 **For mobile testing (optional now):**
   - Install Capacitor plugins (see `NEXT_STEPS.md`)
   - Build native apps
   - Test on physical devices

---

## Time Estimate

- **Phase 1 Basic Test:** 2 minutes
- **Phase 2 Basic Test:** 3 minutes
- **Edge Cases:** 2 minutes
- **Multiple Inputs:** 3 minutes

**Total:** ~10 minutes for comprehensive testing

---

## Help & Documentation

**Detailed Testing:**
- See `docs/TESTING_GUIDE.md` (44 test cases)

**Phase Details:**
- `docs/PHASE_1_COMPLETE.md`
- `docs/PHASE_2_COMPLETE.md`

**Setup & Installation:**
- `NEXT_STEPS.md`
- `docs/PERMISSIONS_FIX.md`

**Full Summary:**
- `PHASE_1_AND_2_SUMMARY.md`

---

**Happy Testing!** 🎉

If you need help, check the documentation above or report the issue with details.

---

**Last Updated:** 2026-02-03
**Status:** Ready for Testing
