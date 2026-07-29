import { useCallback, useEffect, useRef, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  INITIAL_RATING_PROMPT_STATE,
  RatingPromptState,
  shouldPromptRating,
} from '@/lib/ratingPrompt';

const storageKey = (userId: string) => `rating_prompt_${userId}`;

async function loadState(userId: string): Promise<RatingPromptState> {
  try {
    const { value } = await Preferences.get({ key: storageKey(userId) });
    if (!value) return { ...INITIAL_RATING_PROMPT_STATE };
    return { ...INITIAL_RATING_PROMPT_STATE, ...(JSON.parse(value) as Partial<RatingPromptState>) };
  } catch {
    return { ...INITIAL_RATING_PROMPT_STATE };
  }
}

async function saveState(userId: string, state: RatingPromptState): Promise<void> {
  await Preferences.set({ key: storageKey(userId), value: JSON.stringify(state) }).catch(() => {});
}

/**
 * Decides when to surface the rating sheet.
 *
 * Local Preferences is the source of truth for cadence (works offline); the `app_feedback`
 * table is checked once per session so a user who rated on another device is not asked again.
 */
export function useAppRating() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const stateRef = useRef<RatingPromptState>({ ...INITIAL_RATING_PROMPT_STATE });
  // Guards against the effect re-running (auth refresh, remount) and re-prompting.
  const checkedForUserRef = useRef<string | null>(null);

  const persist = useCallback(
    async (patch: Partial<RatingPromptState>) => {
      if (!user) return;
      stateRef.current = { ...stateRef.current, ...patch };
      await saveState(user.id, stateRef.current);
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      checkedForUserRef.current = null;
      return;
    }
    if (checkedForUserRef.current === user.id) return;
    checkedForUserRef.current = user.id;

    let cancelled = false;

    (async () => {
      const state = await loadState(user.id);
      if (cancelled) return;
      stateRef.current = state;

      // First ever check for this user — start the grace-period clock and stop here.
      if (state.firstSeenAt === null) {
        await persist({ firstSeenAt: Date.now() });
        return;
      }

      if (state.rated || state.dismissedForever) return;

      // Cross-device check: did they already rate elsewhere?
      const { data } = await supabase
        .from('app_feedback')
        .select('id')
        .eq('user_id', user.id)
        .eq('kind', 'rating')
        .limit(1);

      if (cancelled) return;

      if (data && data.length > 0) {
        await persist({ rated: true });
        return;
      }

      if (shouldPromptRating(stateRef.current, Date.now())) {
        await persist({ lastPromptedAt: Date.now() });
        if (!cancelled) setOpen(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, persist]);

  /** User submitted stars — stop asking. */
  const markRated = useCallback(async () => {
    await persist({ rated: true });
    setOpen(false);
  }, [persist]);

  /** "Don't ask again" — stop asking without a submission. */
  const dismissForever = useCallback(async () => {
    await persist({ dismissedForever: true });
    setOpen(false);
  }, [persist]);

  /** Backdrop / close dismiss — re-eligible after 24h, since lastPromptedAt is already set. */
  const dismissForNow = useCallback(() => setOpen(false), []);

  return { open, setOpen, markRated, dismissForever, dismissForNow };
}
