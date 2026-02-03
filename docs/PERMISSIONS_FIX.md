# Capacitor Permissions Fix - Complete Guide

## Issue
Voice input and camera features were not working on mobile (Android/iOS) due to missing permission configurations.

## Root Cause
1. **Android:** AndroidManifest.xml only had INTERNET permission
2. **iOS:** Info.plist had correct permissions already ✅
3. **No runtime permission handling:** App didn't request permissions before using features

## Solution Implemented

### 1. Android Permissions (AndroidManifest.xml)

**Added permissions:**
```xml
<!-- Camera & Photo Library -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

<!-- Microphone & Audio Recording -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- Location (for currency detection) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Feature declarations -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />
```

**Why maxSdkVersion?**
- `READ_EXTERNAL_STORAGE` (maxSdk=32): Android 13+ uses scoped storage with READ_MEDIA_IMAGES
- `WRITE_EXTERNAL_STORAGE` (maxSdk=28): Android 10+ uses scoped storage, no write needed

**Why required="false"?**
- Allows app to be installed on devices without camera/microphone
- Features gracefully degrade (e.g., hide camera button if no camera)

---

### 2. iOS Permissions (Info.plist)

**Already configured correctly:**
```xml
<key>NSCameraUsageDescription</key>
<string>To scan receipts and extract transaction data.</string>

<key>NSMicrophoneUsageDescription</key>
<string>To record voice commands for transaction entry.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>To save receipt images.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>To upload receipt images for data extraction.</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>To transcribe voice commands into text.</string>
```

**No changes needed for iOS!**

---

### 3. Runtime Permission Handling (usePermissions Hook)

**Created: `src/hooks/usePermissions.ts`**

**Features:**
- Check permission status before using feature
- Request permission gracefully with user-friendly messages
- Handle denials (permanent vs. temporary)
- Works on web, iOS, and Android
- Uses Capacitor native APIs when available

**API:**
```typescript
const {
  isNative,
  checking,
  ensurePermission, // Auto check + request
  checkCameraPermission,
  requestCameraPermission,
  checkPhotosPermission,
  requestPhotosPermission,
  checkMicrophonePermission,
  requestMicrophonePermission,
  checkLocationPermission,
  requestLocationPermission
} = usePermissions();

// Usage:
const hasPermission = await ensurePermission('camera');
if (!hasPermission) {
  toast({ title: 'Camera access denied' });
}
```

**Supported Permission Types:**
- `'camera'` - Native camera access
- `'photos'` - Photo library access
- `'microphone'` - Audio recording
- `'location'` - Geolocation

---

### 4. Integration with Existing Components

#### Voice Input (useVoiceInput.ts)
```typescript
// Before starting voice recognition
const hasPermission = await ensurePermission('microphone');
if (!hasPermission) {
  setError('Microphone access denied. Please enable in device settings.');
  return;
}

recognitionRef.current.start();
```

#### Receipt Upload (ReceiptUpload.tsx)
```typescript
// Before opening file picker
if (isNative) {
  const hasCameraPermission = await ensurePermission('camera');
  const hasPhotosPermission = await ensurePermission('photos');

  if (!hasCameraPermission && !hasPhotosPermission) {
    toast({
      title: 'Permission Required',
      description: 'Please enable Camera or Photo Library access.'
    });
    return;
  }
}

fileInputRef.current?.click();
```

---

### 5. Capacitor Plugin Installation

**Required plugins:**
```bash
npm install @capacitor/camera @capacitor/geolocation
```

**Plugin sync:**
```bash
npx cap sync
```

**Rebuild native apps:**
```bash
# Android
npx cap open android
# Then build in Android Studio

# iOS
npx cap open ios
# Then build in Xcode
```

---

## Permission Flow Diagrams

### Camera/Photos Permission Flow
```
User taps "Scan Receipt"
    ↓
ReceiptUpload.tsx calls handleFilePickerClick()
    ↓
usePermissions.ensurePermission('camera')
    ↓
┌─ Already granted? → Open file picker
├─ Prompt? → Show system permission dialog → Granted? → Open picker
└─ Denied? → Show toast: "Enable in settings" → Stop
```

### Microphone Permission Flow
```
User taps "Voice" button
    ↓
VoiceInputFlow component loads
    ↓
User taps microphone icon
    ↓
useVoiceInput.startListening()
    ↓
usePermissions.ensurePermission('microphone')
    ↓
┌─ Already granted? → Start speech recognition
├─ Prompt? → Show system permission dialog → Granted? → Start recognition
└─ Denied? → Show error: "Microphone access denied" → Stop
```

---

## User Experience

### Permission Request Timing
**Good UX:** Request permission **when user takes action** (taps button)
**Bad UX:** Request all permissions on app startup

### Error Messages

**Permanent Denial (user tapped "Don't Allow" or "Never Ask Again"):**
- Android: "Microphone access denied. Please enable in Settings > Apps > Hisabify > Permissions > Microphone"
- iOS: "Microphone access denied. Please enable in Settings > Hisabify > Microphone"

**Temporary Denial (user can be asked again):**
- "Microphone access required. Please allow when prompted."

**Feature Not Supported:**
- "Microphone not supported in this browser. Try Chrome or Safari."

---

## Testing Checklist

### Android Testing

1. **Fresh install (first time):**
   - [ ] Tap Voice button → System prompt appears
   - [ ] Tap "Allow" → Voice recording starts
   - [ ] Tap "Deny" → Error message shows

2. **Permission denied (never ask again):**
   - [ ] Go to Settings > Apps > Hisabify > Permissions
   - [ ] Disable Microphone
   - [ ] Tap Voice button → Error message with Settings link

3. **Camera/Photos:**
   - [ ] Tap Scan button → System prompt appears
   - [ ] Tap "Allow" → File picker opens
   - [ ] Tap "Deny" → Error message shows

4. **Location:**
   - [ ] Currency detection uses location (if implemented)
   - [ ] System prompt appears on first use

### iOS Testing

1. **Fresh install:**
   - [ ] Same flow as Android

2. **Permission denied:**
   - [ ] Go to Settings > Hisabify
   - [ ] Disable Microphone
   - [ ] Tap Voice button → Error message with Settings link

3. **Camera/Photos:**
   - [ ] Same flow as Android

4. **Speech Recognition:**
   - [ ] iOS-specific permission for Siri/Dictation
   - [ ] Prompt appears when using Web Speech API

### Web Testing

1. **Browser support:**
   - [ ] Chrome: getUserMedia prompts appear
   - [ ] Safari: Same prompts
   - [ ] Firefox: Same prompts
   - [ ] Edge: Same prompts

2. **Permission states:**
   - [ ] First visit: Prompt appears
   - [ ] Denied: Error message shows
   - [ ] Allowed: Features work immediately

---

## Troubleshooting

### Issue: "Microphone not working on Android"

**Possible causes:**
1. Permission not in AndroidManifest.xml
2. Permission not requested at runtime
3. App not rebuilt after manifest change

**Solution:**
```bash
# 1. Verify manifest has RECORD_AUDIO permission
cat android/app/src/main/AndroidManifest.xml | grep RECORD_AUDIO

# 2. Sync Capacitor
npx cap sync

# 3. Rebuild in Android Studio
npx cap open android
# Build > Clean Project > Rebuild Project
```

---

### Issue: "Camera permission prompt not showing on iOS"

**Possible causes:**
1. Missing NSCameraUsageDescription in Info.plist
2. iOS privacy restrictions

**Solution:**
```bash
# 1. Check Info.plist
cat ios/App/App/Info.plist | grep -A 1 NSCameraUsageDescription

# 2. Rebuild in Xcode
npx cap open ios
# Product > Clean Build Folder > Build
```

---

### Issue: "Permission denied permanently, can't request again"

**Explanation:**
- Android: User tapped "Don't ask again" + "Deny"
- iOS: User denied permission once (iOS doesn't show prompt again)

**Solution:**
- Direct user to Settings with clear instructions
- Show link/button to open app settings
- Use `ensurePermission()` which detects this state

---

## Best Practices

### 1. Request Permissions Contextually
```typescript
// ✅ Good: Request when user taps feature button
<button onClick={async () => {
  const ok = await ensurePermission('camera');
  if (ok) openCamera();
}}>
  Scan Receipt
</button>

// ❌ Bad: Request on app startup
useEffect(() => {
  ensurePermission('camera'); // User confused: "Why does it need camera?"
}, []);
```

### 2. Handle Denials Gracefully
```typescript
const ok = await ensurePermission('microphone');
if (!ok) {
  toast({
    title: 'Microphone Access Required',
    description: 'Enable in Settings > Hisabify > Microphone',
    action: <Button onClick={openAppSettings}>Open Settings</Button>
  });
  return; // Don't proceed with feature
}
```

### 3. Explain Why Permission Is Needed
```typescript
// Show explanation before requesting (optional but recommended)
<Alert>
  <AlertTitle>Microphone Access</AlertTitle>
  <AlertDescription>
    We need microphone access to transcribe your voice commands.
  </AlertDescription>
  <Button onClick={() => ensurePermission('microphone')}>
    Allow Access
  </Button>
</Alert>
```

### 4. Test on Real Devices
- Emulators may not accurately simulate permission flows
- Test on Android 10+, 13+ (different storage permissions)
- Test on iOS 14+, 16+ (privacy changes)

---

## Platform Differences

| Feature | Android | iOS | Web |
|---------|---------|-----|-----|
| **Camera** | Runtime permission required | Runtime permission required | Browser prompt |
| **Microphone** | Runtime permission required | Runtime permission required | Browser prompt |
| **Photos** | READ_MEDIA_IMAGES (Android 13+) | Photo Library permission | File picker (no permission) |
| **Location** | Fine + Coarse permissions | Location When In Use | Browser prompt |
| **Re-request** | Allowed (unless "Never ask again") | Not allowed (must go to Settings) | Allowed |
| **Settings Link** | Can open app settings programmatically | Can open app settings programmatically | Can't open browser settings |

---

## Security Considerations

### 1. Minimal Permissions
Only request permissions actually needed. Don't add "just in case."

### 2. Runtime Checks
Always check permissions at runtime, even if in manifest (user can revoke).

### 3. Privacy Policy
Document what data is collected and why permissions are needed.

### 4. Data Retention
- Receipts: Stored in Supabase with RLS
- Voice recordings: Not stored (transcribed client-side)
- Location: Not stored (used only for currency detection)

---

## Future Enhancements

### 1. Permission Rationale Dialog
Show custom explanation before system prompt:
```typescript
if (shouldShowRationale) {
  await showDialog({
    title: 'Microphone Access',
    message: 'Speak your expenses instead of typing them!'
  });
}
const ok = await ensurePermission('microphone');
```

### 2. Permission Status UI
Show permission status in settings:
```typescript
<SettingsSection title="Permissions">
  <PermissionRow
    icon={Mic}
    label="Microphone"
    status={micStatus} // granted | denied | not-determined
    onEnable={() => openAppSettings()}
  />
</SettingsSection>
```

### 3. Background Location (Future)
For automatic transaction tracking:
- Requires ACCESS_BACKGROUND_LOCATION (Android)
- Requires "Always" location permission (iOS)
- More strict privacy requirements

---

## References

- [Android Permissions Guide](https://developer.android.com/guide/topics/permissions/overview)
- [iOS Permissions Guide](https://developer.apple.com/documentation/uikit/protecting_the_user_s_privacy)
- [Capacitor Permissions API](https://capacitorjs.com/docs/apis/permissions)
- [Web Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-03
**Status:** Implemented ✅
