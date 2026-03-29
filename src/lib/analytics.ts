import { env } from './env';
import { Capacitor } from '@capacitor/core';

/**
 * Firebase Analytics + Crashlytics service (Android native only).
 *
 * - Lazy-loaded via dynamic import() — zero startup cost when disabled.
 * - Gated by VITE_ENABLE_ANALYTICS env var and native platform check.
 * - Fire-and-forget: callers never need to await.
 * - No PII — only Supabase user.id (UUID), never email.
 */

// Event name constants
export const AnalyticsEvents = {
  // Auth
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  // Transactions
  ADD_TRANSACTION: 'add_transaction',
  EDIT_TRANSACTION: 'edit_transaction',
  DELETE_TRANSACTION: 'delete_transaction',
  // Features
  CREATE_BUDGET: 'create_budget',
  CREATE_SAVINGS_GOAL: 'create_savings_goal',
  SCAN_RECEIPT: 'scan_receipt',
  VOICE_INPUT: 'voice_input',
  EXPORT_REPORT: 'export_report',
  // Subscription
  VIEW_SUBSCRIPTION: 'view_subscription',
  SUBSCRIPTION_CTA_CLICK: 'subscription_cta_click',
} as const;

type FirebaseAnalytics = typeof import('@capacitor-firebase/analytics').FirebaseAnalytics;
type FirebaseCrashlytics = typeof import('@capacitor-firebase/crashlytics').FirebaseCrashlytics;

class AnalyticsService {
  private analyticsModule: FirebaseAnalytics | null = null;
  private crashlyticsModule: FirebaseCrashlytics | null = null;
  private initPromise: Promise<void> | null = null;

  private get enabled(): boolean {
    return env.VITE_ENABLE_ANALYTICS && Capacitor.isNativePlatform();
  }

  /** Lazy-load native modules once. */
  private async init(): Promise<void> {
    if (!this.enabled) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const [analyticsImport, crashlyticsImport] = await Promise.all([
          import('@capacitor-firebase/analytics'),
          import('@capacitor-firebase/crashlytics'),
        ]);
        this.analyticsModule = analyticsImport.FirebaseAnalytics;
        this.crashlyticsModule = crashlyticsImport.FirebaseCrashlytics;
      } catch (e) {
        console.warn('[Analytics] Failed to load Firebase modules:', e);
      }
    })();

    return this.initPromise;
  }

  /** Set user ID after authentication. */
  async setUser(userId: string): Promise<void> {
    await this.init();
    this.analyticsModule?.setUserId({ userId }).catch(() => {});
    this.crashlyticsModule?.setUserId({ userId }).catch(() => {});
  }

  /** Clear user ID on logout. */
  async clearUser(): Promise<void> {
    await this.init();
    this.analyticsModule?.setUserId({ userId: '' }).catch(() => {});
  }

  /** Log a named event with optional params. */
  async logEvent(name: string, params?: Record<string, string | number | boolean>): Promise<void> {
    await this.init();
    this.analyticsModule?.logEvent({ name, params: params ?? {} }).catch(() => {});
  }

  /** Log a screen view. */
  async logScreenView(screenName: string): Promise<void> {
    await this.init();
    this.analyticsModule?.setCurrentScreen({ screenName }).catch(() => {});
  }

  /** Track auth events. */
  async trackAuth(action: 'sign_up' | 'login' | 'logout', method?: string): Promise<void> {
    const params: Record<string, string> = {};
    if (method) params.method = method;
    await this.logEvent(action, params);
  }

  /** Record non-fatal error in Crashlytics. */
  async trackError(code: string, message: string): Promise<void> {
    await this.init();
    this.crashlyticsModule?.recordException({ message: `[${code}] ${message}` }).catch(() => {});
  }

  /** Enable Crashlytics collection. */
  async initCrashlytics(): Promise<void> {
    await this.init();
    this.crashlyticsModule?.setEnabled({ enabled: true }).catch(() => {});
  }
}

export const analytics = new AnalyticsService();

/**
 * Fire-and-forget analytics event. Safe to call from any context —
 * lazy-loads the analytics module and silently swallows errors.
 */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>): void {
  analytics.logEvent(name, params).catch(() => {});
}
