# Staging Firebase Configuration

Place your `google-services.json` for the staging Firebase project (`hisabify-stg`) in this directory.

## Steps to obtain it

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add project** → name it `hisabify-stg`
2. Add an Android app with package name: `io.synark.hisabify.staging`
3. Enable: **Analytics**, **Crashlytics**, **Cloud Messaging**
4. Download `google-services.json` and place it here:
   `android/app/src/staging/google-services.json`

This file is intentionally excluded from version control. See `docs/ANDROID_ENVIRONMENTS.md` for the full setup guide.
