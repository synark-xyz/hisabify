import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, UserX, AlertTriangle, FileJson, BarChart3, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDataManagement } from '@/hooks/useDataManagement';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';

// Read at analytics call sites to honour the opt-out.
export const ANALYTICS_OPT_OUT_KEY = 'analytics_opted_out';

function downloadFile(filename: string, content: string, mime: string) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.07, duration: 0.25, ease: 'easeOut' },
    }),
};

export function DataPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { exportData, logPrivacyAction } = useDataManagement();
    const { toast } = useToast();

    const [analyticsEnabled, setAnalyticsEnabled] = useState(
        () => !localStorage.getItem(ANALYTICS_OPT_OUT_KEY),
    );
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
    const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState('');
    const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

    // The Privacy Policy promises exports in "CSV, JSON, or summary", so both
    // formats download together rather than making the user choose.
    const handleExportAllData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { csv, json } = await exportData();
            const stamp = format(new Date(), 'yyyy-MM-dd');
            downloadFile(`hisabify_export_${stamp}.json`, json, 'application/json');
            downloadFile(`hisabify_export_${stamp}.csv`, csv, 'text/csv');

            toast({ title: t('profileData.exportComplete'), description: t('profileData.exportCompleteDesc') });
        } catch {
            // useDataManagement already surfaced a destructive toast.
        }
        setLoading(false);
    };

    const handleToggleAnalytics = (enabled: boolean) => {
        setAnalyticsEnabled(enabled);
        if (enabled) {
            localStorage.removeItem(ANALYTICS_OPT_OUT_KEY);
        } else {
            localStorage.setItem(ANALYTICS_OPT_OUT_KEY, 'true');
        }
        toast({ title: enabled ? t('profileData.analyticsOn') : t('profileData.analyticsOff') });
    };

    const legalLinks = [
        { path: '/privacy', label: t('page.privacyPolicy') },
        { path: '/terms', label: t('page.termsConditions') },
    ];

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
            // Logged before the wipe: the audit_log INSERT policy needs a live
            // session, and signOut() below ends it.
            await logPrivacyAction('financial_data_deleted');
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
            // Logged first, while the session still exists. The row is
            // orphaned by design — it evidences that erasure was requested
            // and honoured after the account itself is gone.
            await logPrivacyAction('account_deleted');
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
        <div className={cn("min-h-screen", "bg-background")}>
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
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileJson className="w-5 h-5 text-primary" />
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

                {/* ── Privacy ───────────────────────────────────────────── */}
                <motion.p
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-1 pt-4"
                    custom={2} variants={cardVariants} initial="hidden" animate="visible"
                >
                    {t('profileData.privacy')}
                </motion.p>

                <motion.div
                    custom={2} variants={cardVariants} initial="hidden" animate="visible"
                    className="bg-card rounded-2xl border border-border/50 overflow-hidden"
                >
                    <div className="flex items-center gap-4 p-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">{t('profileData.usageAnalytics')}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('profileData.usageAnalyticsDesc')}
                            </p>
                        </div>
                        <Switch
                            checked={analyticsEnabled}
                            onCheckedChange={handleToggleAnalytics}
                            aria-label={t('profileData.usageAnalytics')}
                        />
                    </div>

                    <div className="border-t border-border/50">
                        {legalLinks.map((link) => (
                            <motion.div
                                key={link.path}
                                onClick={() => navigate(link.path)}
                                className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-accent" />
                                </div>
                                <p className="flex-1 font-semibold text-foreground text-sm">{link.label}</p>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ── Danger Zone ───────────────────────────────────────── */}
                <motion.div
                    custom={3} variants={cardVariants} initial="hidden" animate="visible"
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
                    custom={4} variants={cardVariants} initial="hidden" animate="visible"
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
                    custom={5} variants={cardVariants} initial="hidden" animate="visible"
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
