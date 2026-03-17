/**
 * Stub for Firebase web SDK modules.
 *
 * The @capacitor-firebase/* plugins ship web fallback code that imports
 * from firebase/analytics, firebase/app, etc. We only use the native
 * Android SDK (via Capacitor bridge), so we stub these to avoid bundling
 * the full Firebase JS SDK. The web code paths are never reached because
 * analytics.ts guards with Capacitor.isNativePlatform().
 */

// firebase/app stubs
export const initializeApp = () => ({});
export const getApp = () => ({});

// firebase/analytics stubs
export const getAnalytics = () => ({});
export const logEvent = () => {};
export const setAnalyticsCollectionEnabled = () => {};
export const setConsent = () => {};
export const setUserId = () => {};
export const setUserProperties = () => {};
export const setCurrentScreen = () => {};
export const isSupported = () => Promise.resolve(false);

// firebase/crashlytics — no web SDK exists, but stub just in case
export const getCrashlytics = () => ({});

// Re-export enums that may be referenced
export const ConsentStatus = { GRANTED: 'granted', DENIED: 'denied' };
export const ConsentType = { AD_PERSONALIZATION: 'ad_personalization', AD_STORAGE: 'ad_storage', AD_USER_DATA: 'ad_user_data', ANALYTICS_STORAGE: 'analytics_storage' };
