import { AppError, toAppError } from './errors';
import { isDev, isProd, env } from './env';

/**
 * Error Logging Setup
 * 
 * - Development: Detailed console logging
 * - Production: Console + Sentry (if configured)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private sentryInitialized = false;

  constructor() {
    this.initSentry();
  }

  private async initSentry() {
    // Only initialize Sentry in production with a valid DSN
    if (isProd && env.VITE_SENTRY_DSN) {
      try {
        // Dynamic import to avoid loading Sentry in development
        // Note: You would need to install @sentry/react package
        // const Sentry = await import('@sentry/react');
        // Sentry.init({ dsn: env.VITE_SENTRY_DSN });
        // this.sentryInitialized = true;
        console.info('[Logger] Sentry DSN configured - install @sentry/react for production logging');
      } catch (e) {
        console.warn('[Logger] Failed to initialize Sentry:', e);
      }
    }
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (isDev) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (isDev) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
    
    // In production, you could send warnings to Sentry as well
    // if (isProd && this.sentryInitialized) {
    //   Sentry.captureMessage(message, 'warning');
    // }
  }

  error(error: unknown, context?: LogContext) {
    const appError = toAppError(error);
    
    // Always log to console
    console.error(this.formatMessage('error', appError.message, {
      ...context,
      code: appError.code,
      isRetryable: appError.isRetryable,
    }));

    // In development, log the full error object
    if (isDev) {
      console.error('Full error:', appError.originalError || appError);
    }

    // In production, send to Sentry
    // if (isProd && this.sentryInitialized) {
    //   Sentry.captureException(appError.originalError || appError, {
    //     tags: { code: appError.code },
    //     extra: { ...context, appError: appError.toJSON() },
    //   });
    // }

    // Send non-fatal errors to Crashlytics
    import('./analytics').then(({ analytics }) => {
      analytics.trackError(String(appError.code || 'unknown'), appError.message);
    }).catch(() => {});
  }

  /**
   * Log API call results
   */
  apiCall(endpoint: string, method: string, success: boolean, duration?: number, context?: LogContext) {
    const message = `API ${method} ${endpoint} - ${success ? 'SUCCESS' : 'FAILED'}${duration ? ` (${duration}ms)` : ''}`;
    
    if (success) {
      this.debug(message, context);
    } else {
      this.warn(message, context);
    }
  }

  /**
   * Log user actions for analytics
   */
  userAction(action: string, context?: LogContext) {
    this.info(`User action: ${action}`, context);
    import('./analytics').then(({ analytics }) => {
      analytics.logEvent(action, context as Record<string, string | number>);
    }).catch(() => {});
  }
}

export const logger = new Logger();
