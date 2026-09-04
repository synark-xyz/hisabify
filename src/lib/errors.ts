/**
 * Custom Error Types for Hisabify
 * 
 * Provides structured error handling with specific error types
 * for different scenarios (API, Auth, Validation, etc.)
 */

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppErrorDetails {
  code: ErrorCode;
  message: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
  isRetryable: boolean;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly originalError?: unknown;
  public readonly context?: Record<string, unknown>;
  public readonly isRetryable: boolean;
  public readonly timestamp: Date;

  constructor(details: AppErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.originalError = details.originalError;
    this.context = details.context;
    this.isRetryable = details.isRetryable;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

// Specific error factory functions
export const createNetworkError = (message: string, originalError?: unknown): AppError =>
  new AppError({
    code: 'NETWORK_ERROR',
    message: message || 'Network connection failed. Please check your internet.',
    originalError,
    isRetryable: true,
  });

export const createApiError = (message: string, originalError?: unknown, context?: Record<string, unknown>): AppError =>
  new AppError({
    code: 'API_ERROR',
    message,
    originalError,
    context,
    isRetryable: true,
  });

export const createAuthError = (message: string, originalError?: unknown): AppError =>
  new AppError({
    code: 'AUTH_ERROR',
    message: message || 'Authentication failed. Please sign in again.',
    originalError,
    isRetryable: false,
  });

export const createValidationError = (message: string, context?: Record<string, unknown>): AppError =>
  new AppError({
    code: 'VALIDATION_ERROR',
    message,
    context,
    isRetryable: false,
  });

export const createNotFoundError = (resource: string): AppError =>
  new AppError({
    code: 'NOT_FOUND',
    message: `${resource} not found.`,
    isRetryable: false,
  });

export const createPermissionError = (message?: string): AppError =>
  new AppError({
    code: 'PERMISSION_DENIED',
    message: message || 'You do not have permission to perform this action.',
    isRetryable: false,
  });

export const createRateLimitError = (): AppError =>
  new AppError({
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please wait a moment and try again.',
    isRetryable: true,
  });

export const createServerError = (message?: string, originalError?: unknown): AppError =>
  new AppError({
    code: 'SERVER_ERROR',
    message: message || 'The server is having trouble. Please try again shortly.',
    originalError,
    isRetryable: true,
  });

/**
 * Read an HTTP status off the many error shapes this app sees.
 *
 * Supabase/PostgREST rejects with a plain object, not an `Error`, so an `instanceof Error`
 * check alone classifies every backend failure as UNKNOWN_ERROR.
 */
function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as Record<string, unknown>;
  for (const key of ['status', 'statusCode', 'httpStatus']) {
    const value = e[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && /^\d{3}$/.test(value)) return Number(value);
  }
  // PostgrestError.code is a Postgres SQLSTATE ('23505'), not an HTTP status. Ignore it.
  return undefined;
}

function readMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'An unexpected error occurred.';
}

/**
 * Convert unknown errors to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error === null || error === undefined) {
    return new AppError({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred.',
      isRetryable: false,
    });
  }

  const message = readMessage(error);
  const haystack = message.toLowerCase();
  const status = readStatus(error);

  // Transport failure: the request never reached a server, so there is no status to read.
  // `fetch` rejects with a TypeError whose text differs per engine — "Failed to fetch"
  // (Chromium), "Load failed" (WebKit), "NetworkError when attempting to fetch resource"
  // (Gecko) — which is why this matches several spellings rather than one.
  if (
    status === undefined &&
    (haystack.includes('failed to fetch') ||
      haystack.includes('load failed') ||
      haystack.includes('networkerror') ||
      haystack.includes('network') ||
      haystack.includes('timeout') ||
      haystack.includes('timed out') ||
      haystack.includes('offline'))
  ) {
    return createNetworkError(message, error);
  }

  if (status !== undefined) {
    if (status >= 500) return createServerError(message, error);
    if (status === 429) return createRateLimitError();
    if (status === 404) return createNotFoundError('Resource');
    if (status === 401 || status === 403) return createAuthError(message, error);
  }

  if (haystack.includes('rate limit') || haystack.includes('429')) {
    return createRateLimitError();
  }

  if (haystack.includes('not found') || haystack.includes('404')) {
    return createNotFoundError('Resource');
  }

  if (haystack.includes('unauthorized') || haystack.includes('jwt') || haystack.includes('auth')) {
    return createAuthError(message, error);
  }

  if (haystack.includes('internal server error') || /\b5\d{2}\b/.test(haystack)) {
    return createServerError(message, error);
  }

  return new AppError({
    code: 'UNKNOWN_ERROR',
    message,
    originalError: error,
    isRetryable: false,
  });
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  const appError = toAppError(error);
  return appError.message;
}
