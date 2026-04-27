import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativePlatform } = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform,
  },
}));

import {
  getAuthCallbackRouteFromUrl,
  getAuthProviderErrorMessage,
  getEmailAuthRedirectUrl,
  getOAuthRedirectUrl,
  isDuplicateAuthCodeExchangeError,
  parseAuthCallbackParams,
} from '../authRedirect';

describe('authRedirect', () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
    window.history.replaceState({}, '', '/auth');
  });

  it('returns a web callback URL on web', () => {
    expect(getOAuthRedirectUrl()).toBe(`${window.location.origin}/auth/callback`);
  });

  it('returns a native callback URL on native platforms', () => {
    isNativePlatform.mockReturnValue(true);
    Object.defineProperty(window, 'location', {
      value: { origin: 'null' },
      writable: true,
    });

    expect(getOAuthRedirectUrl()).toBe('io.synark.hisabify://auth/callback');
  });

  it('uses a web redirect for email-based auth flows', () => {
    isNativePlatform.mockReturnValue(true);

    expect(getEmailAuthRedirectUrl('/reset-password')).toBe(
      `${window.location.origin}/reset-password`,
    );
  });

  it('parses auth callback parameters from the query string', () => {
    expect(parseAuthCallbackParams('?code=abc123&error=access_denied&error_description=cancelled')).toEqual({
      code: 'abc123',
      error: 'access_denied',
      errorDescription: 'cancelled',
    });
  });

  it('normalizes native callback URLs into router paths', () => {
    expect(getAuthCallbackRouteFromUrl('io.synark.hisabify://auth/callback?code=abc123#state')).toBe(
      '/auth/callback?code=abc123#state',
    );
  });

  it('ignores non-auth deep links', () => {
    expect(getAuthCallbackRouteFromUrl('io.synark.hisabify://profile')).toBeNull();
  });

  it('maps access_denied to a cancellation message', () => {
    expect(getAuthProviderErrorMessage({
      error: 'access_denied',
      errorDescription: 'User denied access',
    })).toBe('Sign-in was cancelled. Please try again.');
  });

  it('maps provider errors to a readable message', () => {
    expect(getAuthProviderErrorMessage({
      error: 'server_error',
      errorDescription: 'Temporary failure',
    })).toBe('Sign-in failed: Temporary failure');
  });

  it('detects duplicate code exchange failures', () => {
    expect(isDuplicateAuthCodeExchangeError('OAuth code has already been used')).toBe(true);
    expect(isDuplicateAuthCodeExchangeError('invalid_grant')).toBe(true);
    expect(isDuplicateAuthCodeExchangeError('network failure')).toBe(false);
  });
});
