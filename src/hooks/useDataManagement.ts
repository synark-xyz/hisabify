// src/hooks/useDataManagement.ts

import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface DataExportResult {
  csv: string;
  json: string;
}

export function useDataManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  const exportData = async (): Promise<DataExportResult> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Fetch all user data from Supabase
      const [
        { data: transactions },
        { data: budgets },
        { data: cards },
        { data: savingsGoals },
        { data: paymentReminders },
      ] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('cards')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('payment_reminders')
          .select('*')
          .eq('user_id', user.id),
      ]);

      // Compile into export object
      const exportObject = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        transactions: transactions || [],
        budgets: budgets || [],
        cards: cards || [],
        savingsGoals: savingsGoals || [],
        paymentReminders: paymentReminders || [],
      };

      // Convert to JSON
      const jsonString = JSON.stringify(exportObject, null, 2);

      // Convert to CSV (simple flat format)
      const csvString = generateCSV(exportObject);

      // Track export (optional, for GDPR logging)
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          action: 'data_export',
          timestamp: new Date().toISOString(),
        })
        .throwOnError();

      toast({
        title: 'Data exported successfully',
        description: 'Your data has been prepared for download.',
      });

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

  const deleteAccount = async (): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Mark account for deletion (30-day grace period)
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      await supabase
        .from('users')
        .update({
          account_deletion_initiated_at: new Date().toISOString(),
          account_deletion_scheduled_for: deletionDate.toISOString(),
        })
        .eq('id', user.id)
        .throwOnError();

      // Log the deletion request (for audit trail)
      await supabase
        .from('audit_log')
        .insert({
          user_id: user.id,
          action: 'account_deletion_initiated',
          timestamp: new Date().toISOString(),
        })
        .throwOnError();

      toast({
        title: 'Account deletion initiated',
        description: 'Your account will be permanently deleted in 30 days. You can cancel anytime.',
      });
    } catch (error) {
      console.error('Account deletion failed:', error);
      toast({
        title: 'Deletion failed',
        description: 'Unable to initiate account deletion. Please try again.',
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
        .single();

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
    deleteAccount,
    getDataExportStatus,
  };
}

// Helper: Convert export object to CSV
function generateCSV(exportObject: any): string {
  let csv = 'Hisabify Data Export\n';
  csv += `Export Date: ${exportObject.exportDate}\n`;
  csv += `User Email: ${exportObject.userEmail}\n\n`;

  // Transactions section
  csv += 'TRANSACTIONS\n';
  csv +=
    'Date,Merchant,Amount,Category,Notes\n';
  exportObject.transactions.forEach((t: any) => {
    csv += `${t.date},"${t.merchant}",${t.amount},"${t.category}","${t.notes || ''}"\n`;
  });

  csv += '\n\nBUDGETS\n';
  csv += 'Category,Period,Limit\n';
  exportObject.budgets.forEach((b: any) => {
    csv += `"${b.category}","${b.period}",${b.limit}\n`;
  });

  csv += '\n\nCARDS\n';
  csv += 'Name,Type,Last4,Balance\n';
  exportObject.cards.forEach((c: any) => {
    csv += `"${c.name}","${c.type}",${c.last4},${c.balance}\n`;
  });

  csv += '\n\nSAVINGS GOALS\n';
  csv += 'Name,Target,Deadline,Progress\n';
  exportObject.savingsGoals.forEach((s: any) => {
    csv += `"${s.name}",${s.target},"${s.deadline}",${s.progress}\n`;
  });

  return csv;
}
