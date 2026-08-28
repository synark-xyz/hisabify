import { useState } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { format } from 'date-fns';
import { AlertTriangle, Crown, Gift, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageShell } from '@/components/PageShell';
import { UpgradeModal } from '@/components/UpgradeModal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/hooks/useSubscription';
import { ENTITLEMENT_ID } from '@/hooks/useRevenueCat';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legalContent';
import { openManageSubscriptions } from '@/lib/appStore';
import { deriveSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscriptionStatus';

const STORE_LABELS: Record<string, string> = {
  PLAY_STORE: 'Google Play',
  APP_STORE: 'App Store',
  MAC_APP_STORE: 'Mac App Store',
  AMAZON: 'Amazon Appstore',
  STRIPE: 'Stripe',
  PROMOTIONAL: 'Promotional',
};

const formatDay = (date: Date) => format(date, 'd MMM yyyy');

export function SubscriptionPage() {
  const { t } = useTranslation();
  const {
    customerInfo,
    referralGrantedUntil,
    loading,
    restorePurchases,
    showCustomerCenter,
  } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const status = deriveSubscriptionStatus({
    customerInfo,
    referralGrantedUntil,
    entitlementId: ENTITLEMENT_ID,
    isNative: Capacitor.isNativePlatform(),
  });

  const handleRestore = async () => {
    setRestoring(true);
    try {
      // restorePurchases already toasts both outcomes.
      await restorePurchases();
    } finally {
      setRestoring(false);
    }
  };

  /**
   * Cancelling is always the store's decision — no RevenueCat API cancels a purchase. For an
   * entitled user the Customer Center is the native in-app sheet that walks them through it
   * (and offers plan change / refund on the way); without an entitlement that sheet has
   * nothing to render, so fall back to the store's own subscription page.
   */
  const handleCancel = async () => {
    if (status.kind !== 'pro') {
      await openManageSubscriptions();
      return;
    }
    setCancelling(true);
    try {
      await showCustomerCenter();
    } finally {
      setCancelling(false);
    }
  };

  const restoreButton = (
    <Button variant="ghost" className="w-full gap-2" onClick={handleRestore} disabled={restoring}>
      {restoring && <Loader2 className="w-4 h-4 animate-spin" />}
      {t('subscriptionPage.restorePurchases')}
    </Button>
  );

  return (
    <PageShell title="settingsPage.subscription" backTo="/settings" className="py-6 space-y-6">
      {/* `loading` waits on revenueCatReady, so a paying user never sees "Free plan" flash first. */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <StatusCard status={status} />

          <div className="space-y-2">
            {/* Shown whenever there could be a store subscription — including `free`, since a
                missed entitlement is precisely when someone comes here looking for cancel. */}
            {Capacitor.isNativePlatform() && status.kind !== 'referral' && (
              <Button
                variant="ghost"
                className="w-full gap-2 text-destructive hover:text-destructive"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {t('subscriptionPage.cancelSubscription')}
              </Button>
            )}

            {(status.kind === 'free' || status.kind === 'referral') && (
              <Button className="w-full gap-2" onClick={() => setShowUpgrade(true)}>
                <Sparkles className="w-4 h-4" />
                {t('dashboard.upgradeToPro')}
              </Button>
            )}

            {status.kind === 'unavailable' ? (
              <Button variant="outline" className="w-full" asChild>
                <a href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=Subscription%20Help`}>
                  {t('profilePersonal.contactSupport')}
                </a>
              </Button>
            ) : (
              restoreButton
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center px-4">
            {t('subscriptionPage.billingTermsHint')}
          </p>
        </>
      )}

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} source="subscription-page" />
    </PageShell>
  );
}

function StatusCard({ status }: { status: SubscriptionStatus }) {
  const { t } = useTranslation();

  if (status.kind === 'pro') {
    const term = t(`subscriptionPage.term.${status.term}`);
    return (
      <Card icon={<Crown className="w-5 h-5 text-amber-500" />} tone="bg-amber-500/10">
        <p className="text-lg font-bold text-foreground">
          {status.isTrial ? t('subscriptionPage.freeTrial') : t('subscriptionPage.proPlan')}
          <span className="text-muted-foreground font-semibold"> · {term}</span>
        </p>
        {status.expiresAt ? (
          <p className="text-sm text-muted-foreground mt-1">
            {status.willRenew
              ? t('subscriptionPage.renewsOn', { date: formatDay(status.expiresAt) })
              : t('subscriptionPage.accessUntil', { date: formatDay(status.expiresAt) })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">{t('subscriptionPage.lifetimeAccess')}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {t('subscriptionPage.purchasedVia', { store: STORE_LABELS[status.store] ?? status.store })}
        </p>
        {!status.willRenew && status.expiresAt && (
          <Notice tone="warning" text={t('subscriptionPage.wontRenewNotice')} />
        )}
        {status.hasBillingIssue && (
          <Notice tone="destructive" text={t('subscriptionPage.billingIssueNotice')} />
        )}
      </Card>
    );
  }

  if (status.kind === 'referral') {
    return (
      <Card icon={<Gift className="w-5 h-5 text-primary" />} tone="bg-primary/10">
        <p className="text-lg font-bold text-foreground">{t('subscriptionPage.proViaReferral')}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t('subscriptionPage.accessUntil', { date: formatDay(status.until) })}
        </p>
        <p className="text-xs text-muted-foreground mt-2">{t('subscriptionPage.referralHint')}</p>
      </Card>
    );
  }

  if (status.kind === 'unavailable') {
    return (
      <Card icon={<Sparkles className="w-5 h-5 text-muted-foreground" />} tone="bg-muted">
        <p className="text-lg font-bold text-foreground">{t('subscriptionPage.statusUnavailable')}</p>
        <p className="text-sm text-muted-foreground mt-1">{t('subscriptionPage.manageInApp')}</p>
      </Card>
    );
  }

  return (
    <Card icon={<Sparkles className="w-5 h-5 text-muted-foreground" />} tone="bg-muted">
      <p className="text-lg font-bold text-foreground">{t('subscriptionPage.freePlan')}</p>
      <p className="text-sm text-muted-foreground mt-1">{t('subscriptionPage.freePlanHint')}</p>
    </Card>
  );
}

function Card({ icon, tone, children }: { icon: React.ReactNode; tone: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm card-3d"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${tone}`}>{icon}</div>
      {children}
    </motion.div>
  );
}

function Notice({ tone, text }: { tone: 'warning' | 'destructive'; text: string }) {
  const styles =
    tone === 'destructive'
      ? 'bg-destructive/10 text-destructive'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-500';
  return (
    <div className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-xs font-medium ${styles}`}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
      <span>{text}</span>
    </div>
  );
}
