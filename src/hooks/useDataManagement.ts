// src/hooks/useDataManagement.ts
//
// GDPR/APPI data-subject operations: right of access (export) and the audit
// trail that evidences them.
//
// Account deletion uses the manual deletion-request flow (review-gated admin
// approval via the process-deletion-request edge function) — see
// src/hooks/useDeletionRequest.ts. This hook only handles data export and
// exposes logPrivacyAction for non-deletion audit events.

import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataExportResult {
  csv: string;
  json: string;
}

export type PrivacyAction = 'data_export' | 'financial_data_deleted' | 'account_deleted' | 'deletion_requested' | 'deletion_request_cancelled';

export function useDataManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Append-only compliance record. Never blocks the action it describes — a
  // user's right of access or erasure does not depend on our bookkeeping.
  const logPrivacyAction = async (action: PrivacyAction): Promise<void> => {
    if (!user) return;
    const { error } = await supabase.from('audit_log').insert({
      user_id: user.id,
      action,
      timestamp: new Date().toISOString(),
    });
    if (error) console.error(`Audit log write failed (${action}):`, error);
  };

  const exportData = async (): Promise<DataExportResult> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const [
        { data: profile },
        { data: transactions },
        { data: budgets },
        { data: cards },
        { data: savingsGoals },
        { data: paymentReminders },
      ] = await Promise.all([
        // public.users is keyed to auth by user_id; `id` is a separate PK.
        supabase.from('users').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('budgets').select('*').eq('user_id', user.id),
        supabase.from('cards').select('*').eq('user_id', user.id),
        supabase.from('savings_goals').select('*').eq('user_id', user.id),
        supabase.from('payment_reminders').select('*').eq('user_id', user.id),
      ]);

      const exportObject = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        profile: profile ?? null,
        transactions: transactions || [],
        budgets: budgets || [],
        cards: cards || [],
        savingsGoals: savingsGoals || [],
        paymentReminders: paymentReminders || [],
      };

      const jsonString = JSON.stringify(exportObject, null, 2);
      const csvString = generateCSV(exportObject);

      await logPrivacyAction('data_export');

      return { csv: csvString, json: jsonString };
    } catch (error) {
      console.error('Data export failed:', error);
      toast({
        title: 'Export failed',
        description: 'Unable to export your data. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getDataExportStatus = async (): Promise<{ lastExported?: Date }> => {
    if (!user) return {};

    try {
      const { data } = await supabase
        .from('audit_log')
        .select('timestamp')
        .eq('user_id', user.id)
        .eq('action', 'data_export')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        lastExported: data?.timestamp ? new Date(data.timestamp) : undefined,
      };
    } catch (error) {
      console.error('Failed to fetch export status:', error);
      return {};
    }
  };

  return {
    exportData,
    getDataExportStatus,
    logPrivacyAction,
  };
}

// CSV is a convenience view of the same data the JSON export carries in full.
// Values are quoted and embedded quotes doubled, per RFC 4180 — an unescaped
// merchant name containing a comma or quote would otherwise corrupt the row.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvSection(
  title: string,
  headers: string[],
  rows: Record<string, unknown>[],
  fields: string[],
): string {
  let out = `\n\n${title}\n${headers.join(',')}\n`;
  for (const row of rows) {
    out += fields.map((f) => csvCell(row[f])).join(',') + '\n';
  }
  return out;
}

interface ExportShape {
  exportDate: string;
  userEmail?: string;
  transactions: Record<string, unknown>[];
  budgets: Record<string, unknown>[];
  cards: Record<string, unknown>[];
  savingsGoals: Record<string, unknown>[];
  paymentReminders: Record<string, unknown>[];
}

export function generateCSV(exportObject: ExportShape): string {
  let csv = 'Hisabify Data Export\n';
  csv += `Export Date,${csvCell(exportObject.exportDate)}\n`;
  csv += `User Email,${csvCell(exportObject.userEmail)}\n`;

  csv += csvSection(
    'TRANSACTIONS',
    ['Date', 'Merchant', 'Type', 'Amount', 'Currency', 'Note'],
    exportObject.transactions,
    ['date', 'merchant', 'type', 'amount', 'currency_original', 'note'],
  );
  csv += csvSection(
    'BUDGETS',
    ['Name', 'Period', 'Amount', 'Start Date', 'End Date'],
    exportObject.budgets,
    ['name', 'period_type', 'amount', 'start_date', 'end_date'],
  );
  csv += csvSection(
    'CARDS',
    ['Card Holder', 'Type', 'Last Four', 'Balance'],
    exportObject.cards,
    ['card_holder', 'card_type', 'last_four', 'balance'],
  );
  csv += csvSection(
    'SAVINGS GOALS',
    ['Name', 'Target Amount', 'Current Amount', 'Deadline'],
    exportObject.savingsGoals,
    ['name', 'target_amount', 'current_amount', 'deadline'],
  );
  csv += csvSection(
    'PAYMENT REMINDERS',
    ['Title', 'Amount', 'Due Date'],
    exportObject.paymentReminders,
    ['title', 'amount', 'due_date'],
  );

  return csv;
}
