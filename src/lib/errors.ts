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

/**
 * Convert unknown errors to AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return createNetworkError(error.message, error);
    }

    if (message.includes('unauthorized') || message.includes('auth')) {
      return createAuthError(error.message, error);
    }

    if (message.includes('not found') || message.includes('404')) {
      return createNotFoundError('Resource');
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return createRateLimitError();
    }

    return new AppError({
      code: 'UNKNOWN_ERROR',
      message: error.message,
      originalError: error,
      isRetryable: false,
    });
  }

  return new AppError({
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
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
