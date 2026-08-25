import * as Sentry from '@sentry/react';
import { env, isProd } from './env';

/**
 * Sentry initialisation.
 *
 * Runs once from main.tsx before the app renders so early errors are captured.
 * No-ops without a DSN (local dev, tests, forks) so nothing is required to run
 * the app.
 */

let initialized = false;

export function initSentry() {
  const dsn = env.VITE_SENTRY_DSN;

  // Only report from production builds with a configured DSN.
  if (initialized || !isProd || !dsn) return;

  Sentry.init({
    dsn,
    environment: env.MODE,
    release: env.VITE_SENTRY_RELEASE,
    // Keep volume (and cost) sane: sample traces, capture all errors.
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });

  initialized = true;
}

export function isSentryEnabled() {
  return initialized;
}

export { Sentry };
