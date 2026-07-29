export interface RatingPromptState {
  /** User submitted a star rating — never prompt again. */
  rated: boolean;
  /** User chose "Don't ask again". */
  dismissedForever: boolean;
  /** Epoch ms of the last time the sheet was shown, or null if never. */
  lastPromptedAt: number | null;
  /** Epoch ms of the first app open we recorded for this user. */
  firstSeenAt: number | null;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Don't ask someone who installed the app an hour ago — they have nothing to rate yet.
 * ponytail: fixed 2-day grace period; swap for an engagement signal (e.g. N transactions
 * logged) if review quality turns out to matter more than review volume.
 */
export const GRACE_PERIOD_MS = 2 * DAY_MS;

export const INITIAL_RATING_PROMPT_STATE: RatingPromptState = {
  rated: false,
  dismissedForever: false,
  lastPromptedAt: null,
  firstSeenAt: null,
};

/**
 * Decide whether to show the rating sheet on this app open.
 * Prompts at most once per day while the user has neither rated nor opted out.
 */
export function shouldPromptRating(state: RatingPromptState, now: number): boolean {
  if (state.rated || state.dismissedForever) return false;

  // firstSeenAt is stamped on the very first check, so a brand new user is always inside
  // the grace period here and gets skipped.
  if (state.firstSeenAt === null) return false;
  if (now - state.firstSeenAt < GRACE_PERIOD_MS) return false;

  if (state.lastPromptedAt === null) return true;
  return now - state.lastPromptedAt >= DAY_MS;
}
