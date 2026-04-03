import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sanitizeInput,
  isValidEmail,
  validatePasswordStrength,
  sanitizeTransactionData,
  sanitizeNumericInput,
  secureCompare,
  generateRandomString,
  isSecureContext,
  sanitizeUrl,
  loginRateLimiter,
  apiRateLimiter,
} from '../security';

// Silence logger.warn noise from RateLimiter
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// sanitizeInput
// ---------------------------------------------------------------------------
describe('sanitizeInput', () => {
  it('removes script tags', () => {
    expect(sanitizeInput('<script>alert(1)</script>hello')).toBe('hello');
  });

  it('removes inline event handlers', () => {
    const result = sanitizeInput('<div onclick="alert(1)">content</div>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('content');
  });

  it('removes javascript: protocol', () => {
    const result = sanitizeInput('javascript:alert(1)');
    expect(result).not.toContain('javascript:');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeInput('  hello world  ')).toBe('hello world');
  });

  it('returns empty string for non-string input (null)', () => {
    expect(sanitizeInput(null as unknown as string)).toBe('');
  });

  it('returns empty string for non-string input (number)', () => {
    expect(sanitizeInput(42 as unknown as string)).toBe('');
  });

  it('truncates input to 10,000 characters', () => {
    const longInput = 'a'.repeat(10_001);
    expect(sanitizeInput(longInput).length).toBe(10_000);
  });

  it('passes through safe plain text unchanged', () => {
    expect(sanitizeInput('Coffee at Starbucks')).toBe('Coffee at Starbucks');
  });
});

// ---------------------------------------------------------------------------
// isValidEmail
// ---------------------------------------------------------------------------
describe('isValidEmail', () => {
  it('accepts a standard valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts an email with subdomains', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('rejects email missing the @ symbol', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects email with missing domain part', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects email with missing local part', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects email with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validatePasswordStrength
// ---------------------------------------------------------------------------
describe('validatePasswordStrength', () => {
  it('returns an error for passwords shorter than 8 characters', () => {
    expect(validatePasswordStrength('Ab1')).toBe(
      'Password must be at least 8 characters long'
    );
  });

  it('returns an error when no lowercase letter is present', () => {
    expect(validatePasswordStrength('ABCDEFG1')).toBe(
      'Password must contain at least one lowercase letter'
    );
  });

  it('returns an error when no uppercase letter is present', () => {
    expect(validatePasswordStrength('abcdefg1')).toBe(
      'Password must contain at least one uppercase letter'
    );
  });

  it('returns an error when no digit is present', () => {
    expect(validatePasswordStrength('Abcdefgh')).toBe(
      'Password must contain at least one number'
    );
  });

  it('returns null for a strong password', () => {
    expect(validatePasswordStrength('Secure123')).toBeNull();
  });

  it('returns null for a password with special characters', () => {
    expect(validatePasswordStrength('P@ssw0rd!')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// RateLimiter (tested via exported loginRateLimiter / apiRateLimiter)
// Each test uses a unique key to avoid inter-test state pollution.
// ---------------------------------------------------------------------------
describe('loginRateLimiter (RateLimiter)', () => {
  it('allows up to the maximum number of attempts', () => {
    const key = `allow-${Date.now()}-${Math.random()}`;
    // loginRateLimiter allows 5 attempts per window
    for (let i = 0; i < 5; i++) {
      expect(loginRateLimiter.isAllowed(key)).toBe(true);
    }
  });

  it('blocks the attempt that exceeds the maximum', () => {
    const key = `block-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) loginRateLimiter.isAllowed(key);
    expect(loginRateLimiter.isAllowed(key)).toBe(false);
  });

  it('allows again after manual reset', () => {
    const key = `reset-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 5; i++) loginRateLimiter.isAllowed(key);
    expect(loginRateLimiter.isAllowed(key)).toBe(false);
    loginRateLimiter.reset(key);
    expect(loginRateLimiter.isAllowed(key)).toBe(true);
  });

  it('returns 0 reset time for an unknown key', () => {
    const key = `unknown-${Date.now()}-${Math.random()}`;
    expect(loginRateLimiter.getResetTime(key)).toBe(0);
  });

  it('returns a positive reset time after the first attempt', () => {
    const key = `time-${Date.now()}-${Math.random()}`;
    loginRateLimiter.isAllowed(key);
    expect(loginRateLimiter.getResetTime(key)).toBeGreaterThan(0);
  });
});

describe('apiRateLimiter (higher limit)', () => {
  it('allows 30 requests per window without blocking', () => {
    const key = `api-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 30; i++) {
      expect(apiRateLimiter.isAllowed(key)).toBe(true);
    }
  });

  it('blocks the 31st request', () => {
    const key = `api-block-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 30; i++) apiRateLimiter.isAllowed(key);
    expect(apiRateLimiter.isAllowed(key)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizeTransactionData
// ---------------------------------------------------------------------------
describe('sanitizeTransactionData', () => {
  it('converts a negative amount to a positive value', () => {
    const result = sanitizeTransactionData({ merchant: 'Shop', amount: -50 });
    expect(result.amount).toBe(50);
  });

  it('truncates merchant name to 255 characters', () => {
    const result = sanitizeTransactionData({
      merchant: 'A'.repeat(300),
      amount: 10,
    });
    expect(result.merchant.length).toBe(255);
  });

  it('truncates note to 1,000 characters', () => {
    const result = sanitizeTransactionData({
      merchant: 'Shop',
      amount: 10,
      note: 'N'.repeat(1_001),
    });
    expect(result.note!.length).toBe(1_000);
  });

  it('passes null note through as null', () => {
    const result = sanitizeTransactionData({ merchant: 'Shop', amount: 10, note: null });
    expect(result.note).toBeNull();
  });

  it('omits note field when not provided', () => {
    const result = sanitizeTransactionData({ merchant: 'Shop', amount: 10 });
    expect(result.note).toBeNull();
  });

  it('sanitizes merchant string (removes script tags)', () => {
    const result = sanitizeTransactionData({
      merchant: '<script>evil</script>Shop',
      amount: 5,
    });
    expect(result.merchant).not.toContain('<script>');
    expect(result.merchant).toContain('Shop');
  });
});

// ---------------------------------------------------------------------------
// sanitizeNumericInput
// ---------------------------------------------------------------------------
describe('sanitizeNumericInput', () => {
  it('returns 0 for NaN input', () => {
    expect(sanitizeNumericInput('abc')).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(sanitizeNumericInput(Infinity)).toBe(0);
  });

  it('returns 0 for -Infinity', () => {
    expect(sanitizeNumericInput(-Infinity)).toBe(0);
  });

  it('clamps values above the maximum safe amount', () => {
    expect(sanitizeNumericInput(1e15)).toBe(999_999_999_999);
  });

  it('clamps values below the negative maximum', () => {
    expect(sanitizeNumericInput(-1e15)).toBe(-999_999_999_999);
  });

  it('parses valid numeric strings', () => {
    expect(sanitizeNumericInput('42.5')).toBe(42.5);
  });

  it('passes through normal numbers unchanged', () => {
    expect(sanitizeNumericInput(123.45)).toBe(123.45);
  });

  it('handles zero', () => {
    expect(sanitizeNumericInput(0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// secureCompare
// ---------------------------------------------------------------------------
describe('secureCompare', () => {
  it('returns true for identical strings', () => {
    expect(secureCompare('hello', 'hello')).toBe(true);
  });

  it('returns false for strings of the same length but different content', () => {
    expect(secureCompare('hello', 'world')).toBe(false);
  });

  it('returns false for strings of different lengths (early exit)', () => {
    expect(secureCompare('hi', 'hello')).toBe(false);
  });

  it('handles empty strings — both empty is true', () => {
    expect(secureCompare('', '')).toBe(true);
  });

  it('handles empty vs non-empty', () => {
    expect(secureCompare('', 'x')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateRandomString
// ---------------------------------------------------------------------------
describe('generateRandomString', () => {
  it('returns a hex string of length 64 by default (32 bytes)', () => {
    const str = generateRandomString();
    expect(str.length).toBe(64);
  });

  it('returns a hex string of correct length for a custom byte count', () => {
    const str = generateRandomString(16);
    expect(str.length).toBe(32); // 16 bytes × 2 hex chars = 32
  });

  it('contains only hexadecimal characters', () => {
    const str = generateRandomString();
    expect(str).toMatch(/^[0-9a-f]+$/);
  });

  it('produces different values on successive calls', () => {
    expect(generateRandomString()).not.toBe(generateRandomString());
  });
});

// ---------------------------------------------------------------------------
// isSecureContext
// ---------------------------------------------------------------------------
describe('isSecureContext', () => {
  it('returns true in the jsdom test environment (hostname is localhost)', () => {
    // jsdom sets window.location.hostname = 'localhost', so this should be true
    expect(isSecureContext()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// sanitizeUrl
// ---------------------------------------------------------------------------
describe('sanitizeUrl', () => {
  it('returns the pathname for a same-origin relative URL', () => {
    expect(sanitizeUrl('/dashboard')).toBe('/dashboard');
  });

  it('preserves query string and hash for same-origin URL', () => {
    const result = sanitizeUrl('/transactions?filter=month#top');
    expect(result).toBe('/transactions?filter=month#top');
  });

  it('returns null for a cross-origin URL', () => {
    expect(sanitizeUrl('https://evil.com/steal')).toBeNull();
  });

  it('returns null for a URL with a different protocol (ftp)', () => {
    // ftp:// won't match http://localhost origin
    expect(sanitizeUrl('ftp://localhost/file')).toBeNull();
  });
});
