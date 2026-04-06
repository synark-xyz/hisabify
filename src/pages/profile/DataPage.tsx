import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, UserX, AlertTriangle, FileJson } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.07, duration: 0.25, ease: 'easeOut' },
    }),
};

export function DataPage() {
    const { variant } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { profile } = useProfile();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
    const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState('');
    const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

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

            toast({ title: 'Export complete', description: 'Your data has been downloaded.' });
        } catch {
            toast({ title: 'Export failed', description: 'Could not export data', variant: 'destructive' });
        }
        setLoading(false);
    };

    const deleteAllTableData = async (userId: string) => {
        await Promise.all([
            supabase.from('transactions').delete().eq('user_id', userId),
            supabase.from('budgets').delete().eq('user_id', userId),
            supabase.from('cards').delete().eq('user_id', userId),
            supabase.from('savings_goals').delete().eq('user_id', userId),
            supabase.from('payment_reminders').delete().eq('user_id', userId),
            supabase.from('recurring_expenses').delete().eq('user_id', userId),
            supabase.from('report_templates').delete().eq('user_id', userId),
        ]);
    };

    const handleDeleteData = async () => {
        if (deleteConfirmText !== 'DELETE') return;
        setDeleteLoading(true);

        try {
            await deleteAllTableData(user!.id);
            await signOut();
            toast({ title: 'Data deleted', description: 'All your financial data has been removed.' });
            navigate('/auth');
        } catch {
            toast({ title: 'Error', description: 'Could not delete account data', variant: 'destructive' });
        }
        setDeleteLoading(false);
        setShowDeleteDialog(false);
    };

    const handleDeleteFullAccount = async () => {
        if (deleteAccountConfirmText !== 'DELETE ACCOUNT') return;
        setDeleteAccountLoading(true);

        try {
            await deleteAllTableData(user!.id);
            const { error } = await supabase.functions.invoke('delete-user');
            if (error) throw error;

            await signOut();
            toast({ title: 'Account deleted', description: 'Your account and all data have been permanently removed.' });
            navigate('/auth');
        } catch {
            toast({ title: 'Error', description: 'Could not delete your account. Please try again or contact support.', variant: 'destructive' });
        }
        setDeleteAccountLoading(false);
        setShowDeleteAccountDialog(false);
    };

    return (
        <div className={cn("min-h-screen", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>
            <main className="px-4 py-6 space-y-3 max-w-lg mx-auto">

                {/* ── Your Data ─────────────────────────────────────────── */}
                <motion.p
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1"
                    custom={0} variants={cardVariants} initial="hidden" animate="visible"
                >
                    Your Data
                </motion.p>

                <motion.div
                    custom={1} variants={cardVariants} initial="hidden" animate="visible"
                    className="bg-card rounded-2xl border border-border/50 overflow-hidden"
                >
                    <div className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <FileJson className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">{t('profileData.exportData')}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Download all transactions, budgets, cards &amp; goals as JSON
                            </p>
                        </div>
                    </div>
                    <div className="px-4 pb-4">
                        <Button
                            onClick={handleExportAllData}
                            disabled={loading}
                            variant="outline"
                            size="sm"
                            className="w-full"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {loading ? 'Exporting…' : 'Download JSON'}
                        </Button>
                    </div>
                </motion.div>

                {/* ── Danger Zone ───────────────────────────────────────── */}
                <motion.div
                    custom={2} variants={cardVariants} initial="hidden" animate="visible"
                    className="flex items-center gap-3 pt-4 pb-1 px-1"
                >
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    <p className="text-xs font-semibold text-destructive uppercase tracking-wider">
                        Danger Zone
                    </p>
                    <div className="flex-1 h-px bg-destructive/20" />
                </motion.div>

                {/* Delete Financial Data — amber (account stays) */}
                <motion.div
                    custom={3} variants={cardVariants} initial="hidden" animate="visible"
                    className="bg-amber-500/5 rounded-2xl border border-amber-500/25 overflow-hidden"
                >
                    <div className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Trash2 className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">{t('profileData.deleteFinancialData')}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Erase all records — your login account is kept
                            </p>
                        </div>
                    </div>

                    <div className="px-4 pb-4">
                        <AlertDialog
                            open={showDeleteDialog}
                            onOpenChange={(open) => {
                                setShowDeleteDialog(open);
                                if (!open) setDeleteConfirmText('');
                            }}
                        >
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/60"
                                >
                                    Delete Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete all financial data?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This permanently removes all transactions, budgets, cards, savings goals, and reminders.
                                        Your login account stays active. This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-3 space-y-1.5">
                                    <Label className="text-sm">
                                        {t('profileData.typeDeleteConfirm')}
                                    </Label>
                                    <Input
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder={t('profileData.deletePlaceholder')}
                                        autoComplete="off"
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteData}
                                        disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        {deleteLoading ? 'Deleting…' : 'Delete Data'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </motion.div>

                {/* Delete Account — red (fully irreversible) */}
                <motion.div
                    custom={4} variants={cardVariants} initial="hidden" animate="visible"
                    className="bg-destructive/5 rounded-2xl border border-destructive/25 overflow-hidden"
                >
                    <div className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                            <UserX className="w-5 h-5 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">Delete Account</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Permanently remove your account and all data
                            </p>
                        </div>
                    </div>

                    <div className="px-4 pb-4">
                        <AlertDialog
                            open={showDeleteAccountDialog}
                            onOpenChange={(open) => {
                                setShowDeleteAccountDialog(open);
                                if (!open) setDeleteAccountConfirmText('');
                            }}
                        >
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full">
                                    Delete Account
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This removes your account and everything in it — transactions, budgets, cards,
                                        goals, and login credentials. You will not be able to sign in again.
                                        This cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="py-3 space-y-1.5">
                                    <Label className="text-sm">
                                        {t('profileData.typeDeleteAccountConfirm')}
                                    </Label>
                                    <Input
                                        value={deleteAccountConfirmText}
                                        onChange={(e) => setDeleteAccountConfirmText(e.target.value)}
                                        placeholder={t('profileData.deleteAccountPlaceholder')}
                                        autoComplete="off"
                                    />
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteFullAccount}
                                        disabled={deleteAccountConfirmText !== 'DELETE ACCOUNT' || deleteAccountLoading}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        {deleteAccountLoading ? 'Deleting…' : 'Delete My Account'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </motion.div>

            </main>
        </div>
    );
}
