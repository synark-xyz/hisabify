import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  shouldUpdateRates,
  markRatesUpdated,
  getTimeUntilNextUpdate,
  getLastUpdateTime,
} from '../exchangeRateService';

const STORAGE_KEY = 'exchange-rate-last-update';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Reset localStorage before every test to ensure clean state
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// shouldUpdateRates
// ---------------------------------------------------------------------------
describe('shouldUpdateRates', () => {
  it('returns true when no stored timestamp exists', () => {
    expect(shouldUpdateRates()).toBe(true);
  });

  it('returns false when rates were updated less than 24 hours ago', () => {
    const recentTime = Date.now() - (ONE_DAY_MS / 2); // 12 hours ago
    localStorage.setItem(STORAGE_KEY, String(recentTime));
    expect(shouldUpdateRates()).toBe(false);
  });

  it('returns true when rates were updated exactly 24 hours ago (boundary: >=)', () => {
    // The implementation uses (now - lastUpdateTime) >= UPDATE_INTERVAL (greater-than-or-equal),
    // so a timestamp that is EXACTLY one interval old returns true.
    const exactlyOneDayAgo = Date.now() - ONE_DAY_MS;
    localStorage.setItem(STORAGE_KEY, String(exactlyOneDayAgo));
    expect(shouldUpdateRates()).toBe(true);
  });

  it('returns true when rates were updated more than 24 hours ago', () => {
    const twoDaysAgo = Date.now() - (ONE_DAY_MS * 2);
    localStorage.setItem(STORAGE_KEY, String(twoDaysAgo));
    expect(shouldUpdateRates()).toBe(true);
  });

  it('returns true when the stored value is "0" (epoch)', () => {
    localStorage.setItem(STORAGE_KEY, '0');
    expect(shouldUpdateRates()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// markRatesUpdated
// ---------------------------------------------------------------------------
describe('markRatesUpdated', () => {
  it('writes a timestamp to localStorage', () => {
    const before = Date.now();
    markRatesUpdated();
    const after = Date.now();

    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(after);
  });

  it('overrides a previously stored timestamp', () => {
    localStorage.setItem(STORAGE_KEY, '999');
    markRatesUpdated();
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
    expect(stored).toBeGreaterThan(999);
  });

  it('causes shouldUpdateRates to return false immediately after marking', () => {
    markRatesUpdated();
    expect(shouldUpdateRates()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getTimeUntilNextUpdate
// ---------------------------------------------------------------------------
describe('getTimeUntilNextUpdate', () => {
  it('returns 0 when no stored timestamp exists', () => {
    expect(getTimeUntilNextUpdate()).toBe(0);
  });

  it('returns a positive value when rates were recently updated', () => {
    markRatesUpdated();
    const timeLeft = getTimeUntilNextUpdate();
    expect(timeLeft).toBeGreaterThan(0);
    expect(timeLeft).toBeLessThanOrEqual(ONE_DAY_MS);
  });

  it('returns 0 when rates are overdue for update', () => {
    const twoDaysAgo = Date.now() - (ONE_DAY_MS * 2);
    localStorage.setItem(STORAGE_KEY, String(twoDaysAgo));
    expect(getTimeUntilNextUpdate()).toBe(0);
  });

  it('decreases as time passes (monotonically non-increasing)', () => {
    markRatesUpdated();
    const t1 = getTimeUntilNextUpdate();

    // Simulate 1 hour passing
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60 * 60 * 1000);
    const t2 = getTimeUntilNextUpdate();

    expect(t2).toBeLessThan(t1);
  });
});

// ---------------------------------------------------------------------------
// getLastUpdateTime
// ---------------------------------------------------------------------------
describe('getLastUpdateTime', () => {
  it('returns null when no stored timestamp exists', () => {
    expect(getLastUpdateTime()).toBeNull();
  });

  it('returns a Date object matching the stored timestamp', () => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, String(now));

    const result = getLastUpdateTime();
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBe(now);
  });

  it('returns the correct Date after markRatesUpdated()', () => {
    const before = Date.now();
    markRatesUpdated();
    const after = Date.now();

    const result = getLastUpdateTime();
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBeGreaterThanOrEqual(before);
    expect(result!.getTime()).toBeLessThanOrEqual(after);
  });
});
