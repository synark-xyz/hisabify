import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function DataPage() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { profile } = useProfile();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleExportAllData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const [transactionsRes, budgetsRes, cardsRes, savingsRes, remindersRes] = await Promise.all([
                supabase.from('transactions').select('*').eq('user_id', user.id),
                supabase.from('budgets').select('*').eq('user_id', user.id),
                supabase.from('cards').select('*').eq('user_id', user.id),
                supabase.from('savings_goals').select('*').eq('user_id', user.id),
                supabase.from('payment_reminders').select('*').eq('user_id', user.id),
            ]);

            const exportData = {
                exportDate: new Date().toISOString(),
                profile: { ...profile, email: user.email },
                transactions: transactionsRes.data || [],
                budgets: budgetsRes.data || [],
                cards: cardsRes.data || [],
                savingsGoals: savingsRes.data || [],
                paymentReminders: remindersRes.data || [],
            };

            const jsonContent = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `hisabify_export_${format(new Date(), 'yyyy-MM-dd')}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({ title: 'Data exported successfully' });
        } catch (error) {
            toast({ title: 'Export failed', description: 'Could not export data', variant: 'destructive' });
        }
        setLoading(false);
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return;
        setDeleteLoading(true);

        try {
            // Delete all user data
            await Promise.all([
                supabase.from('transactions').delete().eq('user_id', user!.id),
                supabase.from('budgets').delete().eq('user_id', user!.id),
                supabase.from('cards').delete().eq('user_id', user!.id),
                supabase.from('savings_goals').delete().eq('user_id', user!.id),
                supabase.from('payment_reminders').delete().eq('user_id', user!.id),
                supabase.from('recurring_expenses').delete().eq('user_id', user!.id),
                supabase.from('report_templates').delete().eq('user_id', user!.id),
            ]);

            await signOut();
            toast({ title: 'Account data deleted', description: 'Your data has been removed. Contact support to fully delete your account.' });
            navigate('/auth');
        } catch (error) {
            toast({ title: 'Error', description: 'Could not delete account data', variant: 'destructive' });
        }
        setDeleteLoading(false);
        setShowDeleteDialog(false);
    };

    return (
        <div className="min-h-screen bg-background pb-page-content">

            <main className="px-4 py-6 space-y-6">

                {/* Export Card */}
                <div className="bg-card rounded-2xl p-6 border border-border/50 text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Download className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-foreground">Export Data</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                            Download a copy of all your financial data, including transactions, budgets, and goals.
                        </p>
                    </div>
                    <Button
                        onClick={handleExportAllData}
                        disabled={loading}
                        className="w-full"
                        variant="outline"
                    >
                        {loading ? 'Exporting...' : 'Download JSON'}
                    </Button>
                </div>

                {/* Danger Zone */}
                <div className="bg-destructive/5 rounded-2xl p-6 border border-destructive/20 text-center space-y-4">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Trash2 className="w-8 h-8 text-destructive" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-destructive">Delete Account Data</h3>
                        <p className="text-sm text-destructive/80 mt-1 max-w-xs mx-auto">
                            Permanently delete all your financial data. This action cannot be undone.
                        </p>
                    </div>

                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full">
                                Delete Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your account data and remove your data from our servers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <Label>Type <span className="font-mono font-bold">DELETE</span> to confirm</Label>
                                <Input
                                    value={deleteConfirmText}
                                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                                    className="mt-2"
                                    placeholder="DELETE"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    {deleteLoading ? 'Deleting...' : 'Delete Data'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

            </main>
        </div>
    );
}
