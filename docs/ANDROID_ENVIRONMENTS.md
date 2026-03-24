# Android Build Environments

This document describes how to build Hisabify APKs for different environments (debug, staging, release) using Android build types and product flavors.

---

## Build Variants

The Android project uses two axes:

| Axis | Values | Controls |
|---|---|---|
| **Build Type** | `debug`, `staging`, `release` | Deployment environment (where web assets load from) |
| **Product Flavor** | `base`, `pro` | Feature tier |

This produces 6 build variants:

| Variant | App ID | Firebase | Web Source |
|---|---|---|---|
| `baseDebug` / `proDebug` | `io.synark.hisabify` | Root fallback | Local dev server |
| `baseStaging` / `proStaging` | `io.synark.hisabify.staging` | STG project | `https://hisabify-staging.vercel.app` |
| `baseRelease` / `proRelease` | `io.synark.hisabify` | PROD project | Bundled `dist/` |

---

## Prerequisites

- Android Studio Hedgehog or later
- JDK 17+
- Node.js 18+ / Bun
- Firebase Console access (for Firebase setup)
- (For release) Android signing keystore

---

## 1. Firebase Setup (one-time)

### Production Firebase (already configured)
The `android/app/src/release/google-services.json` file points to the production Firebase project (`hisabify`). This is used for `*Release` builds.

The root `android/app/google-services.json` remains as a **debug fallback** (used for `*Debug` builds).

### Staging Firebase (one-time setup)
1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project** → name it `hisabify-stg`
2. Add an Android app:
   - Package name: `io.synark.hisabify.staging`
   - App nickname: `Hisabify Staging`
3. Enable: **Analytics**, **Crashlytics**, **Cloud Messaging**
4. Download `google-services.json`
5. Place it at: `android/app/src/staging/google-services.json`

The Google Services Gradle Plugin resolves `google-services.json` in this priority order:
1. `app/src/{flavor}{buildType}/` (e.g., `src/baseStaging/`)
2. `app/src/{buildType}/` ← used here (e.g., `src/staging/`, `src/release/`)
3. `app/src/{flavor}/`
4. `app/` (root fallback — used for debug)

---

## 2. File Placement Summary

```
android/app/
├── google-services.json              ← debug fallback (PROD or STG Firebase — your choice)
└── src/
    ├── release/
    │   └── google-services.json      ← PROD Firebase project
    └── staging/
        └── google-services.json      ← STG Firebase project (you must create this)
```

---

## 3. Building a Staging APK

The staging environment always points to the fixed alias `https://hisabify-staging.vercel.app`,
which is automatically updated on every push to the `develop` branch via GitHub Actions.

```bash
npm run cap:android:staging
```
This runs:
1. `npm run build` — builds the web app
2. `APP_ENV=staging npx cap sync` — writes the staging URL into `capacitor.config.json`
3. `npx cap open android` — opens Android Studio

In Android Studio: **Build Variants** → select `baseStaging` → **Build APK** (or Run).

### Verifying the staging config
After `cap sync`, check:
```bash
cat android/app/src/main/assets/capacitor.config.json
```
It should contain:
```json
{ "server": { "url": "https://hisabify-staging.vercel.app" } }
```

---

## 4. Building a Production APK

```bash
npm run cap:android:release
```
This runs:
1. `npm run build` — builds the web app
2. `APP_ENV=production npx cap sync` — no `server` block (loads bundled `dist/`)
3. `npx cap open android` — opens Android Studio

In Android Studio: **Build Variants** → select `baseRelease` → **Build APK** (or Generate Signed Bundle).

### Verifying the production config
After `cap sync`, check:
```bash
cat android/app/src/main/assets/capacitor.config.json
```
It should have **no** `server` key.

---

## 5. Debug Workflow (unchanged)

For local development, manually set `APP_ENV='local'` in `capacitor.config.ts`, then:
```bash
npm run dev:android
```

See `CAPACITOR_LOCALHOST_SETUP.md` for the full local dev guide.

---

## 6. Quick Sync Scripts

| Script | Effect |
|---|---|
| `npm run cap:sync:staging` | Syncs with staging Vercel URL (no build) |
| `npm run cap:sync:release` | Syncs with bundled assets (no build) |
| `npm run cap:android:staging` | Full build + sync + open Android Studio (staging) |
| `npm run cap:android:release` | Full build + sync + open Android Studio (release) |

---

## 7. Signing (release builds)

To sign release builds:
1. Generate a keystore: `keytool -genkey -v -keystore hisabify-release.jks -alias hisabify -keyalg RSA -keysize 2048 -validity 10000`
2. Add signing config to `android/app/build.gradle`:
   ```groovy
   signingConfigs {
       release {
           storeFile file('hisabify-release.jks')
           storePassword System.getenv("KEYSTORE_PASSWORD")
           keyAlias "hisabify"
           keyPassword System.getenv("KEY_PASSWORD")
       }
   }
   ```
3. Uncomment `signingConfig signingConfigs.release` in the `release` build type.

Never commit keystore files or passwords to version control.

---

## 8. CI/CD Notes

For automated builds, set these environment variables:

| Variable | Purpose |
|---|---|
| `APP_ENV` | `staging` or `production` |
| `KEYSTORE_PASSWORD` | Keystore password (release builds only) |
| `KEY_PASSWORD` | Key password (release builds only) |

The staging URL is always `https://hisabify-staging.vercel.app` — no dynamic URL needed.
Web deployments are handled by two GitHub Actions workflows:
- **`.github/workflows/staging-deploy.yml`** — deploys `develop` → aliases to `hisabify-staging.vercel.app`
- **`.github/workflows/production-deploy.yml`** — deploys `main` → production

Example CI step (staging):
```bash
npm ci
npm run build
APP_ENV=staging npx cap sync
cd android && ./gradlew assembleBaseStaging
```

Example CI step (release):
```bash
npm ci
npm run build
APP_ENV=production npx cap sync
cd android && ./gradlew bundleBaseRelease
```

---

## 9. Verifying Both APKs on the Same Device

Because `baseStaging` uses `applicationIdSuffix ".staging"`, both APKs install as **separate apps**:
- `io.synark.hisabify` (release)
- `io.synark.hisabify.staging` (staging)

Verify:
```bash
adb shell pm list packages | grep hisabify
# Expected output:
# package:io.synark.hisabify
# package:io.synark.hisabify.staging
```
