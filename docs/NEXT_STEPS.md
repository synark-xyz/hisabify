# Next Steps - Permissions & Phase 2 Setup

## ⚠️ Current Status

**Code Changes:** ✅ Complete (All 5 files + permissions configured)
**Package Installation:** ⚠️ Network error - Manual installation required
**Phase 1 Implementation:** ✅ Complete and testable on web browser
**Phase 2:** 🟢 Ready to start (doesn't require Capacitor plugins for development)

> **Note:** You can continue with Phase 2 development now and install the Capacitor plugins later when you have better network connectivity. The plugins are only needed for testing on mobile devices.

---

## 🔧 Manual Installation Required

The npm install encountered a network error. You need to manually install the Capacitor plugins:

```bash
# Navigate to project directory
cd /Users/sadat.sayem/Biz/contributions/hisabify

# Install Capacitor plugins
npm install @capacitor/camera@^6.0.2 @capacitor/geolocation@^6.0.1

# If npm has issues, try clearing cache first:
npm cache clean --force
npm install @capacitor/camera@^6.0.2 @capacitor/geolocation@^6.0.1

# Verify installation
ls node_modules/@capacitor/ | grep -E "camera|geolocation"
# Should show: camera, geolocation
```

---

## ✅ What's Already Done

### 1. Code Changes Complete
- ✅ Android permissions added to `AndroidManifest.xml`
- ✅ iOS permissions already configured in `Info.plist`
- ✅ Created `src/hooks/usePermissions.ts` (390 lines)
- ✅ Updated `src/hooks/useVoiceInput.ts` with permission checks
- ✅ Updated `src/components/ReceiptUpload.tsx` with permission checks
- ✅ Updated `package.json` with camera & geolocation dependencies

### 2. Phase 1 Complete
- ✅ Created `src/components/InputMethodSheet.tsx`
- ✅ Modified `src/components/BottomNavigation.tsx`
- ✅ Modified `src/components/Layout.tsx`
- ✅ Modified `src/components/NexusModal.tsx`
- ✅ Unified FAB working

### 3. Documentation Complete
- ✅ `docs/PERMISSIONS_FIX.md` (500+ lines)
- ✅ `docs/PERMISSIONS_IMPLEMENTATION_SUMMARY.md`
- ✅ `docs/PHASE_1_COMPLETE.md`
- ✅ `docs/UNIFIED_FAB_IMPLEMENTATION.md`
- ✅ `docs/RECEIPT_IMAGE_OPTIMIZATION.md`
- ✅ `docs/IMPLEMENTATION_PHASES.md`

---

## 📋 Step-by-Step Setup Instructions

### Step 1: Install Dependencies (5 minutes)

```bash
# Make sure you're in the project directory
pwd
# Should show: /Users/sadat.sayem/Biz/contributions/hisabify

# Install Capacitor plugins
npm install @capacitor/camera@^6.0.2 @capacitor/geolocation@^6.0.1

# Verify installation succeeded
npm list @capacitor/camera @capacitor/geolocation
# Should show both packages with version numbers
```

**Expected output:**
```
hisabify@0.0.0 /Users/sadat.sayem/Biz/contributions/hisabify
├── @capacitor/camera@6.0.2
└── @capacitor/geolocation@6.0.1
```

---

### Step 2: Sync Capacitor (2 minutes)

```bash
# Sync web build with native projects
npx cap sync

# This will:
# 1. Copy AndroidManifest.xml changes to Android project
# 2. Copy Info.plist changes to iOS project (no changes needed)
# 3. Update native dependencies
# 4. Link the new Capacitor plugins
```

**Expected output:**
```
✔ Copying web assets from dist to android/app/src/main/assets/public in 1.23s
✔ Copying web assets from dist to ios/App/App/public in 983.45ms
✔ Copying native bridge in 1.45ms
✔ Updating Android plugins in 23.45ms
✔ Updating iOS plugins in 12.34ms
✔ Sync finished in 2.01s
```

---

### Step 3: Rebuild Android (5-10 minutes)

```bash
# Open Android Studio
npx cap open android

# In Android Studio:
# 1. Wait for Gradle sync to complete
# 2. Go to: Build > Clean Project
# 3. Go to: Build > Rebuild Project
# 4. Connect Android device or start emulator
# 5. Click Run button (green play icon)
```

**What to check:**
- ✅ App installs successfully
- ✅ No build errors in Gradle console
- ✅ App launches on device/emulator

---

### Step 4: Rebuild iOS (5-10 minutes)

```bash
# Open Xcode
npx cap open ios

# In Xcode:
# 1. Select "App" scheme (top toolbar)
# 2. Select your device or simulator
# 3. Go to: Product > Clean Build Folder (Cmd+Shift+K)
# 4. Go to: Product > Build (Cmd+B)
# 5. If build succeeds, go to: Product > Run (Cmd+R)
```

**What to check:**
- ✅ App builds successfully
- ✅ No errors in Xcode console
- ✅ App launches on device/simulator

---

### Step 5: Test Permissions (10 minutes)

#### Test 1: Voice Input Permission

**On Android:**
1. Open app
2. Tap unified FAB (Plus button in bottom nav)
3. Tap "Voice" card
4. **Expected:** System prompt: "Allow Hisabify to record audio?"
5. Tap "Allow"
6. **Expected:** Microphone icon appears, ready to record

**Test denial:**
1. Close and reopen app
2. Go to device Settings > Apps > Hisabify > Permissions
3. Disable Microphone
4. Try voice input again
5. **Expected:** Error message: "Microphone access denied. Enable in device settings."

**On iOS:**
1. Same flow as Android
2. iOS prompt says: "Hisabify would like to access the Microphone"
3. Description shown: "To record voice commands for transaction entry."

---

#### Test 2: Camera/Photos Permission

**On Android:**
1. Tap unified FAB → Tap "Scan" card
2. **Expected:** System prompt: "Allow Hisabify to take pictures and record video?"
3. Tap "Allow"
4. **Expected:** Camera or file picker opens

**Test denial:**
1. Settings > Apps > Hisabify > Permissions
2. Disable Camera
3. Try receipt scan again
4. **Expected:** Toast error: "Permission Required - Please enable Camera or Photo Library access"

**On iOS:**
1. Same flow as Android
2. iOS may show two prompts:
   - "Allow Camera access?"
   - "Allow Photos access?"
3. Both needed for full functionality

---

#### Test 3: Web Testing (Bonus)

**In Chrome/Safari:**
1. Open app in browser: http://localhost:8101/
2. Tap unified FAB → Voice
3. **Expected:** Browser permission prompt in address bar
4. Click "Allow"
5. **Expected:** Voice recording works (Web Speech API)

---

### Step 6: Verify Everything Works

**Checklist:**
- [ ] Android app builds and runs
- [ ] iOS app builds and runs
- [ ] Voice input shows permission prompt on Android
- [ ] Voice input shows permission prompt on iOS
- [ ] Camera scan shows permission prompt on Android
- [ ] Camera scan shows permission prompt on iOS
- [ ] Permission denials show clear error messages
- [ ] Web version works in browser

---

## 🐛 Troubleshooting

### Issue: "Module not found: @capacitor/camera"

**Cause:** Package not installed or not synced

**Solution:**
```bash
# Reinstall
npm install @capacitor/camera @capacitor/geolocation

# Sync
npx cap sync

# Rebuild TypeScript
npm run build

# Try opening native project again
npx cap open android  # or ios
```

---

### Issue: Permission prompt not showing

**Possible causes:**
1. Manifest/Info.plist not synced
2. App not rebuilt after changes
3. Permission already granted/denied

**Solution:**
```bash
# 1. Force sync
npx cap sync --force

# 2. Clean build
# Android: Build > Clean > Rebuild in Android Studio
# iOS: Product > Clean Build Folder in Xcode

# 3. Uninstall app from device
adb uninstall io.synark.hisabify  # Android
# Or manually delete from iOS device

# 4. Fresh install
# Run app again from Android Studio/Xcode
```

---

### Issue: Voice input still not working

**Debug steps:**
```bash
# 1. Check if permissions are in manifest
cat android/app/src/main/AndroidManifest.xml | grep RECORD_AUDIO
# Should show: <uses-permission android:name="android.permission.RECORD_AUDIO" />

# 2. Check if usePermissions hook is imported
grep -n "usePermissions" src/hooks/useVoiceInput.ts
# Should show import and usage

# 3. Check Android logcat for errors
adb logcat | grep -i "permission\|audio\|microphone"

# 4. Check iOS console in Xcode
# Look for permission-related errors
```

---

### Issue: Network error during npm install

**If you see "ECONNRESET" or similar:**

```bash
# Option 1: Clear npm cache
npm cache clean --force
npm install @capacitor/camera @capacitor/geolocation

# Option 2: Use different registry
npm install @capacitor/camera @capacitor/geolocation --registry https://registry.npmjs.org/

# Option 3: Check network/proxy
# If behind proxy, configure npm:
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Option 4: Try yarn instead
yarn add @capacitor/camera @capacitor/geolocation
```

---

## 📊 Progress Tracker

### Phase 1: Core UI Components
- [x] InputMethodSheet component created
- [x] BottomNavigation updated
- [x] Layout updated (removed Nexus FAB)
- [x] NexusModal updated (initialMode prop)
- [x] Testing: Manual test on web ✅
- [ ] Testing: Manual test on Android device
- [ ] Testing: Manual test on iOS device

### Permissions Setup
- [x] Android permissions added to manifest
- [x] iOS permissions already configured
- [x] usePermissions hook created
- [x] useVoiceInput updated with permission check
- [x] ReceiptUpload updated with permission check
- [x] Package.json updated with dependencies
- [ ] Dependencies installed (npm install)
- [ ] Capacitor synced (npx cap sync)
- [ ] Android rebuilt
- [ ] iOS rebuilt
- [ ] Permissions tested on Android
- [ ] Permissions tested on iOS

---

## 🎯 What Comes After

Once you've completed the steps above and verified permissions work:

### Phase 2: Voice Input Flow (2 days)
- Create `VoiceInputFlow.tsx` component
- Real-time transcript display
- Waveform animations
- "Use This" button to pre-fill form
- Enhanced parsing logic

### Phase 3: Image Optimization (2 days)
- Create `src/lib/imageProcessor.ts`
- Preprocessing for OCR (grayscale, sharpen)
- Compression for storage (<500KB)
- Canvas API utilities

### Phase 4: Storage Integration (2 days)
- Database schema changes (add receipt fields)
- Supabase Storage bucket setup
- Upload optimized images
- RLS policies

---

## 💡 Quick Commands Reference

```bash
# Install dependencies
npm install @capacitor/camera @capacitor/geolocation

# Sync Capacitor
npx cap sync

# Open Android Studio
npx cap open android

# Open Xcode
npx cap open ios

# Run Android
npm run cap:run:android

# Run iOS
npm run cap:run:ios

# Check installed packages
npm list @capacitor/camera @capacitor/geolocation

# Check Android logcat
adb logcat | grep -i hisabify

# Verify manifest permissions
cat android/app/src/main/AndroidManifest.xml | grep -A 2 "uses-permission"
```

---

## 📞 Need Help?

If you encounter issues:

1. **Check documentation:**
   - `docs/PERMISSIONS_FIX.md` - Detailed guide
   - `docs/PERMISSIONS_IMPLEMENTATION_SUMMARY.md` - Quick reference

2. **Check logs:**
   - Android: `adb logcat`
   - iOS: Xcode console
   - Web: Browser DevTools console

3. **Verify files:**
   - `android/app/src/main/AndroidManifest.xml` - Has all permissions?
   - `ios/App/App/Info.plist` - Has usage descriptions?
   - `src/hooks/usePermissions.ts` - Exists?
   - `src/hooks/useVoiceInput.ts` - Imports usePermissions?

---

## ✅ When You're Ready

After completing all steps above, let me know:

**Option A:** "Permissions working, continue Phase 2"
- I'll implement VoiceInputFlow component

**Option B:** "Stuck on [specific issue]"
- I'll help troubleshoot

**Option C:** "Need help with [Android/iOS/Web]"
- I'll provide platform-specific guidance

---

**Status:** 🔧 Awaiting Manual Installation & Testing
**Priority:** HIGH (Blocks Phase 2 mobile testing)
**Time Estimate:** 30-45 minutes total
**Last Updated:** 2026-02-03
