import { AppError, toAppError } from './errors';
import { isDev } from './env';
import { Sentry, isSentryEnabled } from './sentry';

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
  private get sentryEnabled() {
    return isSentryEnabled();
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

    if (this.sentryEnabled) {
      Sentry.captureMessage(message, { level: 'warning', extra: context });
    }
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
    if (this.sentryEnabled) {
      Sentry.captureException(appError.originalError || appError, {
        tags: { code: String(appError.code ?? 'unknown') },
        extra: { ...context, appError: appError.toJSON() },
      });
    }

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
