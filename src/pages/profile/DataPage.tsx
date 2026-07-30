import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, UserX, AlertTriangle, FileJson, BarChart3, FileText, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDataManagement } from '@/hooks/useDataManagement';
import { useDeletionRequest, DeletionScope, DeletionReason } from '@/hooks/useDeletionRequest';
import { DeletionRequestSheet } from '@/components/DeletionRequestSheet';
import { formatDeletionRequestedDate, formatDeletionDeadline } from '@/lib/deletionRequestBanner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
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
    const { user } = useAuth();
    const { exportData } = useDataManagement();
    const { pendingRequest, submitting, submitRequest, cancelRequest } = useDeletionRequest();
    const { toast } = useToast();

    const [analyticsEnabled, setAnalyticsEnabled] = useState(
        () => !localStorage.getItem(ANALYTICS_OPT_OUT_KEY),
    );
    const [loading, setLoading] = useState(false);
    const [sheetScope, setSheetScope] = useState<DeletionScope | null>(null);

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

    const handleConfirmDeletionRequest = async (reason: DeletionReason | null, detail: string) => {
        if (!sheetScope) return false;
        const ok = await submitRequest(sheetScope, reason, detail);
        if (ok) {
            toast({ title: t('deletionRequest.submitted'), description: t('deletionRequest.submittedDesc') });
        } else {
            toast({ title: t('deletionRequest.submitFailed'), variant: 'destructive' });
        }
        return ok;
    };

    const handleCancelRequest = async () => {
        const ok = await cancelRequest();
        toast(
            ok
                ? { title: t('deletionRequest.cancelled') }
                : { title: t('deletionRequest.cancelFailed'), variant: 'destructive' }
        );
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

                {pendingRequest && (
                    <motion.div
                        custom={3.5} variants={cardVariants} initial="hidden" animate="visible"
                        className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"
                    >
                        <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                {t(
                                    pendingRequest.scope === 'account'
                                        ? 'deletionRequest.bannerTitleAccount'
                                        : 'deletionRequest.bannerTitleData',
                                    { date: formatDeletionRequestedDate(pendingRequest.requested_at) }
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t('deletionRequest.bannerBody', {
                                    deadline: formatDeletionDeadline(pendingRequest.requested_at),
                                })}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                disabled={submitting}
                                onClick={handleCancelRequest}
                            >
                                {t('deletionRequest.cancelRequest')}
                            </Button>
                        </div>
                    </motion.div>
                )}

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
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/60"
                            disabled={!!pendingRequest}
                            onClick={() => setSheetScope('data')}
                        >
                            Delete Data
                        </Button>
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
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            disabled={!!pendingRequest}
                            onClick={() => setSheetScope('account')}
                        >
                            Delete Account
                        </Button>
                    </div>
                </motion.div>

            </main>

            {sheetScope && (
                <DeletionRequestSheet
                    open={!!sheetScope}
                    onOpenChange={(open) => !open && setSheetScope(null)}
                    scope={sheetScope}
                    submitting={submitting}
                    onConfirm={handleConfirmDeletionRequest}
                />
            )}
        </div>
    );
}
