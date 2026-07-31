import { useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getAppVersion } from '@/lib/appStore';
import { logger } from '@/lib/logger';

export type FeedbackType = 'bug' | 'improvement' | 'feature_request' | 'deletion_request' | 'other';

export const FEEDBACK_TYPES: FeedbackType[] = [
  'bug',
  'improvement',
  'feature_request',
  'deletion_request',
  'other',
];

export const MAX_ATTACHMENTS = 3;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const BUCKET = 'feedback-attachments';

interface SubmitRatingInput {
  rating: number;
  comment?: string;
}

interface SubmitFeedbackInput {
  feedbackType: FeedbackType;
  otherLabel?: string;
  message: string;
  files?: File[];
}

/**
 * Uploads attachments to the private per-user folder and returns their storage paths.
 * Paths (not public URLs) — the bucket is private, so support staff resolve them with a
 * signed URL server-side.
 */
async function uploadAttachments(userId: string, files: File[]): Promise<string[]> {
  const paths: string[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    paths.push(path);
  }

  return paths;
}

export function useAppFeedback() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submitRating = useCallback(
    async ({ rating, comment }: SubmitRatingInput): Promise<boolean> => {
      if (!user) return false;

      setSubmitting(true);
      try {
        const { error } = await supabase.from('app_feedback').insert({
          user_id: user.id,
          kind: 'rating',
          rating,
          message: comment?.trim() || null,
          email: user.email ?? null,
          app_version: await getAppVersion(),
          platform: Capacitor.getPlatform(),
        });

        if (error) {
          logger.error(error, { component: 'useAppFeedback', action: 'submitRating' });
          return false;
        }
        return true;
      } finally {
        setSubmitting(false);
      }
    },
    [user]
  );

  const submitFeedback = useCallback(
    async ({ feedbackType, otherLabel, message, files = [] }: SubmitFeedbackInput): Promise<boolean> => {
      if (!user) return false;

      setSubmitting(true);
      try {
        // An attachment failure must not sink the report — send the text either way and
        // let the caller surface the partial result.
        let attachments: string[] = [];
        if (files.length) {
          try {
            attachments = await uploadAttachments(user.id, files);
          } catch (error) {
            logger.error(error, { component: 'useAppFeedback', action: 'uploadAttachments' });
          }
        }

        const { error } = await supabase.from('app_feedback').insert({
          user_id: user.id,
          kind: 'feedback',
          feedback_type: feedbackType,
          other_label: feedbackType === 'other' ? otherLabel?.trim() || null : null,
          message: message.trim(),
          email: user.email ?? null,
          attachments,
          app_version: await getAppVersion(),
          platform: Capacitor.getPlatform(),
        });

        if (error) {
          logger.error(error, { component: 'useAppFeedback', action: 'submitFeedback' });
          return false;
        }
        return true;
      } finally {
        setSubmitting(false);
      }
    },
    [user]
  );

  return { submitRating, submitFeedback, submitting };
}
