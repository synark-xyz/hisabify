// src/hooks/useDeletionRequest.ts
//
// Manual, review-gated deletion: submitting only inserts a pending row —
// nothing is deleted until an admin approves it in /admin (see
// supabase/functions/process-deletion-request). Replaces the instant
// deleteAllTableData()/delete-user flow that used to live in DataPage.tsx.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type DeletionScope = 'data' | 'account';

export type DeletionReason =
  | 'too_expensive'
  | 'missing_features'
  | 'found_better'
  | 'privacy'
  | 'not_using'
  | 'too_complicated'
  | 'other';

export const DELETION_REASONS: DeletionReason[] = [
  'too_expensive',
  'missing_features',
  'found_better',
  'privacy',
  'not_using',
  'too_complicated',
  'other',
];

export interface DeletionRequestRow {
  id: string;
  scope: DeletionScope;
  status: 'pending' | 'cancelled' | 'completed';
  reason: string | null;
  detail: string | null;
  requested_at: string;
}

export function useDeletionRequest() {
  const { user } = useAuth();
  const [pendingRequest, setPendingRequest] = useState<DeletionRequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!user) {
      setPendingRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('id, scope, status, reason, detail, requested_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) {
        logger.error(error, { component: 'useDeletionRequest', action: 'fetchPending' });
      }
      setPendingRequest((data as DeletionRequestRow | null) ?? null);
    } catch (err) {
      logger.error(err, { component: 'useDeletionRequest', action: 'fetchPending' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const submitRequest = useCallback(
    async (scope: DeletionScope, reason: DeletionReason | null, detail: string): Promise<boolean> => {
      if (!user) return false;

      setSubmitting(true);
      try {
        const { error: insertError } = await supabase.from('deletion_requests').insert({
          user_id: user.id,
          email: user.email ?? null,
          scope,
          reason,
          detail: detail.trim() || null,
        });

        if (insertError) {
          logger.error(insertError, { component: 'useDeletionRequest', action: 'submitRequest' });
          return false;
        }

        await supabase.from('audit_log').insert({ user_id: user.id, action: 'deletion_requested' });
        await fetchPending();
        return true;
      } finally {
        setSubmitting(false);
      }
    },
    [user, fetchPending],
  );

  const cancelRequest = useCallback(async (): Promise<boolean> => {
    if (!user || !pendingRequest) return false;

    setSubmitting(true);
    try {
      const { data: updatedRows, error: updateError } = await supabase
        .from('deletion_requests')
        .update({ status: 'cancelled' })
        .eq('id', pendingRequest.id)
        .eq('status', 'pending')
        .select('id');

      if (updateError || !updatedRows?.length) {
        if (updateError) {
          logger.error(updateError, { component: 'useDeletionRequest', action: 'cancelRequest' });
        }
        return false;
      }

      await supabase.from('audit_log').insert({ user_id: user.id, action: 'deletion_request_cancelled' });
      await fetchPending();
      return true;
    } finally {
      setSubmitting(false);
    }
  }, [user, pendingRequest, fetchPending]);

  return { pendingRequest, loading, submitting, submitRequest, cancelRequest };
}
