import { describe, it, expect } from 'vitest';

import { toErrorVariant, isRetryableVariant } from '@/lib/errorState';
import { createServerError, createNotFoundError, toAppError } from '@/lib/errors';

describe('toErrorVariant', () => {
  it('reports offline whenever the device is offline, whatever the error says', () => {
    expect(toErrorVariant(createServerError('boom'), false)).toBe('offline');
    expect(toErrorVariant(createNotFoundError('Budget'), false)).toBe('offline');
    expect(toErrorVariant(null, false)).toBe('offline');
  });

  it('treats a transport failure as offline even when navigator claims we are online', () => {
    // The captive-portal / dead-backend case: navigator.onLine lies, the request does not.
    expect(toErrorVariant(new TypeError('Failed to fetch'), true)).toBe('offline');
    expect(toErrorVariant(new TypeError('Load failed'), true)).toBe('offline');
    expect(toErrorVariant(new Error('NetworkError when attempting to fetch resource.'), true)).toBe('offline');
  });

  it('maps 5xx and rate limiting to the server variant', () => {
    expect(toErrorVariant({ message: 'Internal Server Error', status: 500 }, true)).toBe('server');
    expect(toErrorVariant({ message: 'Bad gateway', status: 502 }, true)).toBe('server');
    expect(toErrorVariant({ message: 'slow down', status: 429 }, true)).toBe('server');
  });

  it('maps a missing resource to the notFound variant', () => {
    expect(toErrorVariant({ message: 'No row found', status: 404 }, true)).toBe('notFound');
  });

  it('falls back to generic for an unrecognised failure', () => {
    expect(toErrorVariant(new Error("Cannot read properties of undefined"), true)).toBe('generic');
  });

  it('offers retry for everything except notFound', () => {
    expect(isRetryableVariant('offline')).toBe(true);
    expect(isRetryableVariant('server')).toBe(true);
    expect(isRetryableVariant('generic')).toBe(true);
    expect(isRetryableVariant('notFound')).toBe(false);
  });
});

describe('toAppError', () => {
  it('classifies a Supabase-style plain object, which is not an Error instance', () => {
    // The whole reason page-level classification used to fail: PostgrestError is a plain
    // object, so an `instanceof Error` check alone made every backend failure UNKNOWN.
    expect(toAppError({ message: 'permission denied', status: 401 }).code).toBe('AUTH_ERROR');
    expect(toAppError({ message: 'kaput', status: 503 }).code).toBe('SERVER_ERROR');
  });

  it('marks transport and server failures as retryable, and auth failures as not', () => {
    expect(toAppError(new TypeError('Failed to fetch')).isRetryable).toBe(true);
    expect(toAppError({ message: 'kaput', status: 500 }).isRetryable).toBe(true);
    expect(toAppError({ message: 'nope', status: 403 }).isRetryable).toBe(false);
  });

  it('does not throw on null or undefined', () => {
    expect(toAppError(null).code).toBe('UNKNOWN_ERROR');
    expect(toAppError(undefined).code).toBe('UNKNOWN_ERROR');
  });

  it('ignores a Postgres SQLSTATE in `code`, which is not an HTTP status', () => {
    expect(toAppError({ message: 'duplicate key', code: '23505' }).code).toBe('UNKNOWN_ERROR');
  });
});
