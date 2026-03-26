import { Capacitor } from '@capacitor/core';

const DEFAULT_APP_URL_SCHEME = 'io.synark.hisabify';
const AUTH_CALLBACK_PATH = '/auth/callback';

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getWindowOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  if (!window.location.origin || window.location.origin === 'null') return null;
  return window.location.origin;
}

export function getAppUrlScheme(): string {
  const configuredScheme = import.meta.env.VITE_APP_URL_SCHEME?.trim();
  return configuredScheme || DEFAULT_APP_URL_SCHEME;
}

export function getWebAppOrigin(): string {
  return getWindowOrigin() || trimTrailingSlash(import.meta.env.VITE_APP_URL || 'http://localhost');
}

export function getEmailAuthRedirectUrl(path: string): string {
  return `${getWebAppOrigin()}${normalizePath(path)}`;
}

export function getOAuthRedirectUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return `${getAppUrlScheme()}://auth/callback`;
  }

  return getEmailAuthRedirectUrl(AUTH_CALLBACK_PATH);
}

export interface AuthCallbackParams {
  code: string | null;
  error: string | null;
  errorDescription: string | null;
}

export function parseAuthCallbackParams(search: string): AuthCallbackParams {
  const normalizedSearch = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(normalizedSearch);

  return {
    code: params.get('code'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
}

export function getAuthProviderErrorMessage({
  error,
  errorDescription,
}: Pick<AuthCallbackParams, 'error' | 'errorDescription'>): string | null {
  if (!error) return null;

  if (error === 'access_denied') {
    return 'Sign-in was cancelled. Please try again.';
  }

  if (errorDescription) {
    return `Sign-in failed: ${errorDescription}`;
  }

  return `Sign-in failed: ${error}`;
}

export function isDuplicateAuthCodeExchangeError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes('already been used') ||
    normalizedMessage.includes('code verifier') ||
    normalizedMessage.includes('invalid grant') ||
    normalizedMessage.includes('invalid_grant')
  );
}

export function getAuthCallbackRouteFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const expectedProtocol = `${getAppUrlScheme()}:`;
    const routePath = parsed.protocol === expectedProtocol
      ? `/${parsed.host}${parsed.pathname}`.replace(/\/+/g, '/')
      : parsed.pathname;

    if (routePath !== AUTH_CALLBACK_PATH) {
      return null;
    }

    return `${AUTH_CALLBACK_PATH}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
