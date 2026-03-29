import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { logger } from '@/lib/logger';

/**
 * Hook for managing user's AI preferences
 */
export function useAIPreferences() {
  const { user } = useAuth();
  const { profile } = useProfile();

  // Get the current confidence threshold (default to 0.6 if not set)
  const confidenceThreshold = (profile?.ai_confidence_threshold as number) || 0.6;

  /**
   * Update the confidence threshold
   */
  const setConfidenceThreshold = useCallback(
    async (threshold: number): Promise<boolean> => {
      if (!user) {
        logger.warn('User not authenticated');
        return false;
      }

      // Validate threshold
      if (threshold < 0 || threshold > 1) {
        logger.warn('Invalid confidence threshold', { threshold });
        return false;
      }

      try {
        const { error } = await supabase
          .from('users')
          .update({ ai_confidence_threshold: threshold })
          .eq('id', user.id);

        if (error) {
          logger.error('Failed to update AI preferences', error);
          return false;
        }

        logger.debug('AI preferences updated', { threshold });
        return true;
      } catch (err) {
        logger.error('Failed to update AI preferences', err);
        return false;
      }
    },
    [user]
  );

  return {
    confidenceThreshold,
    setConfidenceThreshold,
  };
}
