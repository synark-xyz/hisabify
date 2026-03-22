# Plan: Android Stage/Production Environment Separation

## Context

Currently `capacitor.config.ts` hardcodes `APP_ENV = 'production'`. There are no build type or flavor variants — only a single `release` build type. The correct Android architecture is:

- **Build Types** (`debug`, `staging`, `release`) → control the *deployment environment* (where web assets load from)
- **Product Flavors** (`base`, `pro`) → control the *feature tier*

This separation gives 6 variants: `baseDebug`, `baseStaging`, `baseRelease`, `proDebug`, `proStaging`, `proRelease`.

**Desired behavior:**
- `*Release` → loads bundled `dist/` assets (Play Store)
- `*Staging` → loads from Vercel preview URL (QA testing)
- `*Debug` → unchanged (developer manually sets local server in capacitor.config.ts)

---

## Files to Modify

1. `capacitor.config.ts`
2. `android/app/build.gradle`
3. `package.json`

## Files to Create / Move

4. `android/app/src/release/google-services.json` ← move from `android/app/google-services.json`
5. `android/app/src/staging/google-services.json` ← user creates from new Firebase STG project
6. `docs/ANDROID_ENVIRONMENTS.md` ← step-by-step guide

---

## Implementation Steps

### Step 1 — `capacitor.config.ts`: Make env-var driven

Replace the hardcoded values on lines 21–23 with `process.env` reads:

```ts
const APP_ENV: 'production' | 'staging' | 'local' =
  (process.env.APP_ENV as 'production' | 'staging' | 'local') || 'production';

const STAGING_URL = process.env.STAGING_URL || 'https://hisabify-pi.vercel.app';
```

This means:
- `npx cap sync` with no env vars → production mode (bundled assets)
- `APP_ENV=staging STAGING_URL=https://preview-xxx.vercel.app npx cap sync` → staging (Vercel URL)
- Local dev: developer still manually sets `APP_ENV='local'` in the file as before (no change to debug workflow)

---

### Step 2 — `android/app/build.gradle`: Add build types + product flavors

**A. Add `staging` build type** (inside `buildTypes {}`, alongside existing `release`):

```groovy
buildTypes {
    debug {
        // keep as-is — no changes
    }
    staging {
        debuggable true
        minifyEnabled false
        applicationIdSuffix ".staging"
        versionNameSuffix "-staging"
        buildConfigField "String", "ENVIRONMENT", '"staging"'
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
    release {
        minifyEnabled true
        buildConfigField "String", "ENVIRONMENT", '"release"'
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        // signingConfig signingConfigs.release  ← uncomment when keystore is set up
    }
}
```

**B. Add product flavors** (new block inside `android {}`):

```groovy
flavorDimensions "tier"
productFlavors {
    base {
        dimension "tier"
        buildConfigField "String", "TIER", '"base"'
    }
    pro {
        dimension "tier"
        buildConfigField "String", "TIER", '"pro"'
    }
}
```

**C. Update Firebase plugin block** — replace the conditional try/catch at the bottom with unconditional applies (the Google Services plugin 4.x auto-resolves `google-services.json` from `src/{buildType}/` or `src/{flavor}/`):

```groovy
apply plugin: 'com.google.gms.google-services'
apply plugin: 'com.google.firebase.crashlytics'
```

Remove the old try/catch conditional block entirely.

**Build variants produced:**

| Variant | App ID | Firebase | Web Source |
|---|---|---|---|
| `baseDebug` / `proDebug` | `io.synark.hisabify` | (fallback to root) | Local dev server |
| `baseStaging` / `proStaging` | `io.synark.hisabify.staging` | STG project | Vercel preview URL |
| `baseRelease` / `proRelease` | `io.synark.hisabify` | PROD project | Bundled dist/ |

---

### Step 3 — Firebase: Separate `google-services.json` per build type

The Google Services Gradle Plugin resolves `google-services.json` in this priority order:
1. `app/src/{flavor}{buildType}/` (e.g., `src/baseStaging/`)
2. `app/src/{buildType}/` ← **we use this** (e.g., `src/staging/`, `src/release/`)
3. `app/src/{flavor}/`
4. `app/` (root fallback — used for debug)

Actions:
1. **Move** `android/app/google-services.json` → `android/app/src/release/google-services.json`
2. **Create** a new Firebase project `hisabify-stg` (see guide for instructions)
3. **Place** downloaded staging `google-services.json` at `android/app/src/staging/google-services.json`
4. The existing root `android/app/google-services.json` can remain as a **debug fallback** (pointing to either STG or PROD Firebase — user's choice)

---

### Step 4 — `package.json`: New build scripts

Add these scripts:

```json
"cap:sync:staging": "APP_ENV=staging npx cap sync",
"cap:sync:release": "APP_ENV=production npx cap sync",
"cap:android:staging": "npm run build && APP_ENV=staging STAGING_URL=${STAGING_URL:-https://hisabify-pi.vercel.app} npx cap sync && npx cap open android",
"cap:android:release": "npm run build && APP_ENV=production npx cap sync && npx cap open android"
```

**Usage for per-PR Vercel preview URL:**
```bash
STAGING_URL=https://hisabify-abc123.vercel.app npm run cap:android:staging
```

After opening Android Studio:
- Select `baseStaging` or `proStaging` variant to build the staging APK
- Select `baseRelease` or `proRelease` to build the production APK

---

### Step 5 — `docs/ANDROID_ENVIRONMENTS.md`

Comprehensive guide covering:

1. **Prerequisites** — Android Studio, JDK 17+, signing keystore, Firebase Console access, Node/Bun
2. **Firebase Setup (one-time)** — create `hisabify-stg` project, register `io.synark.hisabify.staging`, download `google-services.json`
3. **File placement** — where to put each `google-services.json`
4. **Building staging APK** — run `npm run cap:android:staging`, select `baseStaging` in Android Studio
5. **Building production APK** — run `npm run cap:android:release`, select `baseRelease` in Android Studio
6. **Setting a Vercel preview URL** — `STAGING_URL=https://... npm run cap:android:staging`
7. **Debug workflow** — unchanged; manually set `APP_ENV='local'` in `capacitor.config.ts`
8. **Signing** — keystore setup prerequisites
9. **CI/CD notes** — env vars for automated builds

---

## Firebase Decision

**Yes — you need to create a new Firebase project for staging.** This keeps staging crash reports and analytics separate from real production data.

Steps (to be documented in the guide):
1. Go to Firebase Console → **Add project** → name it `hisabify-stg`
2. Add Android app → Package name: `io.synark.hisabify.staging`
3. Enable: **Analytics**, **Crashlytics**, **Cloud Messaging**
4. Download `google-services.json` → place at `android/app/src/staging/google-services.json`

---

## Verification

1. `npm run build && APP_ENV=staging STAGING_URL=https://hisabify-pi.vercel.app npx cap sync`
   → Check `android/app/src/main/assets/capacitor.config.json` contains `"url": "https://hisabify-pi.vercel.app"`

2. `npm run build && APP_ENV=production npx cap sync`
   → Check `android/app/src/main/assets/capacitor.config.json` has **no** `server` key

3. In Android Studio: Build Variants → select `baseStaging` → Build APK
   → `adb shell pm list packages | grep hisabify` shows `io.synark.hisabify.staging`

4. In Android Studio: Build Variants → select `baseRelease` → Build APK
   → App ID is `io.synark.hisabify`

5. Install both APKs on same device → they install as **separate apps** (different IDs) ✓
