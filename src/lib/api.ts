import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from './logger';
import { 
  AppError, 
  toAppError, 
  createApiError, 
  createAuthError, 
  createNetworkError,
  getErrorMessage 
} from './errors';

/**
 * API Utilities with Error Handling
 * 
 * Provides wrapped Supabase operations with:
 * - Automatic error handling
 * - Toast notifications
 * - Logging
 * - Retry logic for transient failures
 */

interface ApiOptions {
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  retryCount?: number;
  retryDelay?: number;
}

const defaultOptions: ApiOptions = {
  showErrorToast: true,
  showSuccessToast: false,
  retryCount: 0,
  retryDelay: 1000,
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute an async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  options: ApiOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  const startTime = Date.now();
  let lastError: AppError | null = null;
  let attempts = 0;

  while (attempts <= (opts.retryCount || 0)) {
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      logger.apiCall(context, 'OPERATION', true, duration);
      
      if (opts.showSuccessToast && opts.successMessage) {
        toast.success(opts.successMessage);
      }
      
      return result;
    } catch (error) {
      attempts++;
      lastError = toAppError(error);
      
      logger.error(lastError, { context, attempt: attempts });

      // Only retry if error is retryable and we have attempts left
      if (lastError.isRetryable && attempts <= (opts.retryCount || 0)) {
        await sleep(opts.retryDelay || 1000);
        continue;
      }

      break;
    }
  }

  // Show error toast if enabled
  if (opts.showErrorToast && lastError) {
    toast.error(lastError.message);
  }

  throw lastError;
}

/**
 * Supabase query wrapper with error handling
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context: string,
  options: ApiOptions = {}
): Promise<T> {
  return withErrorHandling(async () => {
    const { data, error } = await queryFn();
    
    if (error) {
      // Handle specific Supabase errors
      if (error.code === 'PGRST116') {
        // No rows returned - this might be expected
        return null as T;
      }
      
      if (error.code === '42501' || error.message?.includes('RLS')) {
        throw createAuthError('You do not have permission to access this data.');
      }
      
      if (error.code === '23503') {
        throw createApiError('Referenced record not found.', error);
      }
      
      if (error.message?.includes('JWT')) {
        throw createAuthError('Your session has expired. Please sign in again.');
      }

      throw createApiError(error.message || 'Database operation failed.', error);
    }
    
    return data as T;
  }, context, options);
}

/**
 * Supabase mutation wrapper (insert, update, delete)
 */
export async function safeMutation<T>(
  mutationFn: () => Promise<{ data: T | null; error: any }>,
  context: string,
  options: ApiOptions = {}
): Promise<T> {
  return safeQuery(mutationFn, context, {
    showSuccessToast: true,
    successMessage: 'Saved successfully',
    ...options,
  });
}

/**
 * Edge function caller with error handling
 */
export async function callEdgeFunction<T>(
  functionName: string,
  body?: object,
  options: ApiOptions = {}
): Promise<T> {
  return withErrorHandling(async () => {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body,
    });

    if (error) {
      if (error.message?.includes('rate limit')) {
        throw createApiError('Too many requests. Please wait a moment.', error);
      }
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        throw createNetworkError('Could not connect to server.', error);
      }

      throw createApiError(error.message || `Edge function ${functionName} failed.`, error);
    }

    return data as T;
  }, `edge/${functionName}`, options);
}

/**
 * Convenience function for showing error toasts
 */
export function showError(error: unknown, fallbackMessage = 'An error occurred') {
  const message = getErrorMessage(error);
  toast.error(message || fallbackMessage);
  logger.error(error);
}

/**
 * Convenience function for showing success toasts
 */
export function showSuccess(message: string) {
  toast.success(message);
}
