/**
 * Security Utilities
 * 
 * Provides client-side security measures including:
 * - Input sanitization
 * - Rate limiting
 * - XSS prevention
 * - SQL injection prevention (via parameterized queries in Supabase)
 */

import { logger } from './logger';

/**
 * Sanitize user input to prevent XSS attacks
 * Removes potentially dangerous HTML/JavaScript
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove script tags and event handlers
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
  
  // Trim and limit length to prevent DoS
  sanitized = sanitized.trim().slice(0, 10000);
  
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Returns error message if weak, null if strong
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  
  return null;
}

/**
 * Simple rate limiter for client-side protection
 * Prevents rapid-fire requests (e.g., login attempts)
 */
class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number }> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if action is allowed
   * Returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    const timePassed = now - record.firstAttempt;

    // Reset if window has passed
    if (timePassed > this.windowMs) {
      this.attempts.set(key, { count: 1, firstAttempt: now });
      return true;
    }

    // Check if exceeded max attempts
    if (record.count >= this.maxAttempts) {
      logger.warn('Rate limit exceeded', { key, attempts: record.count });
      return false;
    }

    // Increment count
    record.count++;
    return true;
  }

  /**
   * Get remaining time in seconds before reset
   */
  getResetTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;

    const timePassed = Date.now() - record.firstAttempt;
    const remaining = this.windowMs - timePassed;
    return Math.ceil(remaining / 1000);
  }

  /**
   * Clear rate limit for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Export singleton instances for different actions
export const loginRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
export const apiRateLimiter = new RateLimiter(30, 60000); // 30 requests per minute

/**
 * Sanitize transaction data before sending to backend
 */
export function sanitizeTransactionData(data: {
  merchant: string;
  amount: number;
  note?: string | null;
}): {
  merchant: string;
  amount: number;
  note?: string | null;
} {
  return {
    merchant: sanitizeInput(data.merchant).slice(0, 255),
    amount: Math.abs(Number(data.amount)), // Ensure positive number
    note: data.note ? sanitizeInput(data.note).slice(0, 1000) : null,
  };
}

/**
 * Prevent timing attacks by adding consistent delay
 * Useful for authentication operations
 */
export async function addAuthDelay(): Promise<void> {
  const delay = 100 + Math.random() * 200; // 100-300ms random delay
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Securely compare strings to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check if running in secure context (HTTPS or localhost)
 */
export function isSecureContext(): boolean {
  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/**
 * Validate numeric input to prevent injection
 */
export function sanitizeNumericInput(input: unknown): number {
  const num = Number(input);
  
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }
  
  // Prevent extremely large numbers that could cause issues
  const MAX_SAFE_AMOUNT = 999999999999;
  return Math.min(Math.max(num, -MAX_SAFE_AMOUNT), MAX_SAFE_AMOUNT);
}

/**
 * Validate and sanitize URL to prevent open redirects
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.origin);
    
    // Only allow same origin URLs
    if (parsed.origin !== window.location.origin) {
      logger.warn('Blocked external redirect attempt', { url });
      return null;
    }
    
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return null;
  }
}

/**
 * Generate a random string for CSRF tokens or nonces
 */
export function generateRandomString(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
