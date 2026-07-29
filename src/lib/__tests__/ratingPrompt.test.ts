import { describe, it, expect } from 'vitest';
import {
  shouldPromptRating,
  INITIAL_RATING_PROMPT_STATE,
  DAY_MS,
  GRACE_PERIOD_MS,
  RatingPromptState,
} from '@/lib/ratingPrompt';

const NOW = 1_800_000_000_000;

function state(overrides: Partial<RatingPromptState> = {}): RatingPromptState {
  return { ...INITIAL_RATING_PROMPT_STATE, firstSeenAt: NOW - GRACE_PERIOD_MS, ...overrides };
}

describe('shouldPromptRating', () => {
  it('never prompts a user who already rated', () => {
    expect(shouldPromptRating(state({ rated: true }), NOW)).toBe(false);
  });

  it('never prompts a user who opted out', () => {
    expect(shouldPromptRating(state({ dismissedForever: true }), NOW)).toBe(false);
  });

  it('does not prompt before firstSeenAt is stamped', () => {
    expect(shouldPromptRating(INITIAL_RATING_PROMPT_STATE, NOW)).toBe(false);
  });

  it('does not prompt inside the grace period', () => {
    expect(shouldPromptRating(state({ firstSeenAt: NOW - DAY_MS }), NOW)).toBe(false);
  });

  it('prompts once the grace period has elapsed and it has never prompted', () => {
    expect(shouldPromptRating(state(), NOW)).toBe(true);
  });

  it('does not prompt twice within a day', () => {
    expect(shouldPromptRating(state({ lastPromptedAt: NOW - DAY_MS + 1000 }), NOW)).toBe(false);
  });

  it('prompts again a day after the last prompt', () => {
    expect(shouldPromptRating(state({ lastPromptedAt: NOW - DAY_MS }), NOW)).toBe(true);
  });
});
