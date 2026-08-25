import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, readStoredTheme, resolveTheme } from '@/lib/theme';

describe('resolveTheme', () => {
  it('honours an explicit choice regardless of the OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('resolves "system" against the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('falls back to the default when nothing valid is stored', () => {
    expect(DEFAULT_THEME).toBe('dark');
    for (const bad of [null, undefined, '', 'cyberpunk', 'Light', 42, {}]) {
      expect(resolveTheme(bad, false)).toBe(DEFAULT_THEME);
    }
  });
});

describe('isTheme', () => {
  it('accepts only the three valid values', () => {
    expect(['dark', 'light', 'system'].every(isTheme)).toBe(true);
    expect(isTheme('auto')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe('readStoredTheme', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when the user has never chosen', () => {
    expect(readStoredTheme()).toBeNull();
  });

  it('returns null for a corrupt stored value rather than trusting it', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'cyberpunk');
    expect(readStoredTheme()).toBeNull();
  });

  it('round-trips a persisted choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'system');
    expect(readStoredTheme()).toBe('system');
    expect(resolveTheme(readStoredTheme(), true)).toBe('dark');
  });
});
