# Mobile Deployment Guide (iOS & Android) - Hisabify

You are the planner, and this is the master plan to convert **Hisabify** from a web app into a native mobile app using [Capacitor](https://capacitorjs.com/).

## 📱 Why Capacitor?
We chose Capacitor because it allows us to wrap your existing React+Vite codebase into a native container. 
- **Time to Market**: Instant. No rewriting in Swift/Kotlin.
- **Features**: Access to native Camera (receipts), Push Notifications, and Haptics.
- **Maintenance**: One codebase for Web, iOS, and Android.

---

## 🛠️ Step 1: Initial Setup (One Time)

We need to install the Capacitor runtime and platform adapters.

```bash
# 1. Install Capacitor core and CLI
npm install @capacitor/core
npm install -D @capacitor/cli

# 2. Install Platform adapters
npm install @capacitor/ios @capacitor/android

# 3. Initialize Capacitor config
npx cap init Hisabify io.synark.hisabify
# (When asked for "web asset directory", enter: dist)
```

## 🤖 Step 2: Add Platforms

```bash
# Build the web app first (required before sync)
npm run build

# Add iOS (requires Xcode installed on Mac)
npx cap add ios

# Add Android (requires Android Studio installed)
npx cap add android
```

---

## 🔄 Step 3: Development Workflow

Every time you update your React code (`src/`):

1. **Build the web assets**:
   ```bash
   npm run build
   ```

2. **Sync changes to native projects**:
   ```bash
   npx cap sync
   ```

3. **Run on Simulator/Device**:
   - **iOS**:
     ```bash
     npx cap open ios
     # This opens Xcode. Press the "Play" button (▶) to build and run.
     ```
   - **Android**:
     ```bash
     npx cap open android
     # This opens Android Studio. Press "Run" to launch the emulator.
     ```

---

## 🎨 Step 4: App Icons & Splash Screens

Instead of manually resizing 50 images, we use `capacitor-assets`.

1. **Prepare Assets**:
   - Save your logo as `assets/logo.png` (1024x1024)
   - Save your splash screen as `assets/splash.png` (2732x2732)

2. **Generate Native Assets**:
   ```bash
   npm install -D @capacitor/assets
   npx capacitor-assets generate
   ```

---

## 🔐 Step 5: Handling Deep Links (Supabase Auth)

For "Magic Link" or Social Login to work on mobile, the app needs to handle deep links (e.g., `io.synark.hisabify://login-callback`).

1. **Configure Supabase**: 
   Add `io.synark.hisabify://**` to your "Redirect URLs" in the Supabase Dashboard.

2. **Configure App (`capacitor.config.ts`)**:
   Ensure `server.url` is NOT set for production builds (it loads from local html), but for auth redirects you might need strict schemes.

---

## 🚀 Step 6: App Store Submission

### Apple App Store (iOS)
1. **Join Apple Developer Program** ($99/year).
2. **Xcode**:
   - Set "Team" in Signing Capabilities.
   - Increment "Version" and "Build".
   - `Product` -> `Archive`.
   - `Distribute App` -> `TestFlight` or `App Store Connect`.

### Google Play Store (Android)
1. **Join Google Play Console** ($25 one-time).
2. **Android Studio**:
   - `Build` -> `Generate Signed Bundle / APK`.
   - Create a Keystore (keep this SAFE!).
   - Upload `.aab` file to Play Console.

---

## ⚠️ Known Issues & Fixes
- **Safe Area**: Ensure your layout handles the "Notch" (we used `safe-top` utilities).
- **Text Selection**: We should disable long-press text selection in CSS (`user-select: none`) for a native feel.
- **Touch Feedback**: Use `:active` states or `framer-motion` taps to make buttons feel responsive.
