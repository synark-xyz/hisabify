/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_URL_SCHEME?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_REVENUECAT_API_KEY?: string;
  readonly VITE_REVENUECAT_IOS_API_KEY?: string;
  readonly VITE_REVENUECAT_ANDROID_API_KEY?: string;
  readonly VITE_REVENUECAT_ENTITLEMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
