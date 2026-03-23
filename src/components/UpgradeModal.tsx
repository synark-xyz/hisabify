import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Clock, Crown, RotateCcw, Sparkles, Target, Wallet, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionPricing } from '@/hooks/useSubscriptionPricing';
import { cn } from '@/lib/utils';

const isNativePlatform = Capacitor.isNativePlatform();

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

const DEFAULT_BENEFITS = [
  'Unlimited budgets and savings goals',
  'All-time transaction history — no 30-day cap',
  'Multi-currency support with live exchange rates',
  'Financial report template with PDF & CSV report exports',
  'Advanced analytics, automation, and savings history',
  'AI analysis of spending patterns for deeper insights and personalized financial tips',
  'Voice note, receipt scanner, and Premium App theme -- CyberPunk, and more!'
];

const SOURCE_CONFIG: Record<string, {
  eyebrow: string;
  title: string;
  description: string;
  benefits?: string[];
}> = {
  savings_goals_limit: {
    eyebrow: 'Savings Limit Reached',
    title: 'Unlock unlimited savings goals',
    description: 'Free accounts can track one active savings goal. Upgrade to Pro to create multiple goals, automate contributions, and keep full savings history.',
    benefits: [
      'Create unlimited savings goals',
      'Use auto-contribute for recurring savings',
      'Open savings history and pace tracking',
      'Keep budget and savings planning in sync',
    ],
  },
  budget_limit: {
    eyebrow: 'Budget Limit Reached',
    title: 'Unlock unlimited budgets',
    description: 'Free accounts can track one active budget. Upgrade to Pro to plan multiple categories, carry your budgeting forward, and unlock deeper budget insights.',
    benefits: [
      'Create unlimited budget categories',
      'Unlock budget history and spending trends',
      'Copy budgets into the next period',
      'Connect budgets with savings planning',
    ],
  },
  'guard_Budget History': {
    eyebrow: 'Budget History',
    title: 'Open long-term budget insights',
    description: 'Pro unlocks budget history charts and trend comparison so you can see how spending changes over time.',
  },
  'guard_Savings History': {
    eyebrow: 'Savings History',
    title: 'See the full savings journey',
    description: 'Pro unlocks contribution history, missed-period tracking, and progress charts for every goal.',
  },
  'guard_Savings Automation': {
    eyebrow: 'Savings Automation',
    title: 'Automate your savings plan',
    description: 'Pro unlocks auto-contribute so your savings plan can run on a recurring schedule.',
  },
};

function getUpgradeContent(source?: string) {
  if (!source) {
    return {
      eyebrow: 'Hisabify Pro',
      title: 'Upgrade to Pro',
      description: 'Unlock the full Hisabify experience with better planning, deeper insights, and fewer limits.',
      benefits: DEFAULT_BENEFITS,
    };
  }
  const matched = SOURCE_CONFIG[source];
  if (matched) return { ...matched, benefits: matched.benefits || DEFAULT_BENEFITS };
  return {
    eyebrow: 'Hisabify Pro',
    title: 'Upgrade to Pro',
    description: 'Unlock the full Hisabify experience with better planning, deeper insights, and fewer limits.',
    benefits: DEFAULT_BENEFITS,
  };
}

export function UpgradeModal({ open, onOpenChange, source }: UpgradeModalProps) {
  const { toast } = useToast();
  const { purchasePlan, restorePurchases, revenueCatReady, showPaywall } = useSubscription();
  const { monthlyPrice, yearlyPrice } = useSubscriptionPricing();
  const content = getUpgradeContent(source);
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'yearly' | 'restore' | null>(null);

  // Track when upgrade modal is opened
  useEffect(() => {
    if (open) {
      import('@/lib/analytics').then(({ analytics, AnalyticsEvents }) => {
        analytics.logEvent(AnalyticsEvents.VIEW_SUBSCRIPTION, { source: source || 'modal' });
      }).catch(() => {});
    }
  }, [open, source]);

  // On native: delegate entirely to RevenueCat's built-in paywall UI
  useEffect(() => {
    if (!open || !isNativePlatform) return;
    onOpenChange(false);
    showPaywall();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render the custom modal UI on native — RC handles it
  if (isNativePlatform) return null;

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    import('@/lib/analytics').then(({ analytics, AnalyticsEvents }) => {
      analytics.logEvent(AnalyticsEvents.SUBSCRIPTION_CTA_CLICK, { plan });
    }).catch(() => {});
    setCheckoutLoading(plan);
    try {
      await purchasePlan(plan);
      onOpenChange(false);
    } catch (err) {
      // RC throws with userCancelled=true when user dismisses billing sheet — ignore silently
      if ((err as Record<string, unknown>).userCancelled) return;
      const message = err instanceof Error ? err.message : 'Purchase failed';
      toast({ title: 'Purchase error', description: message, variant: 'destructive' });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleRestore = async () => {
    setCheckoutLoading('restore');
    try {
      await restorePurchases();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      toast({ title: 'Restore error', description: message, variant: 'destructive' });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const purchaseDisabled = checkoutLoading !== null || !revenueCatReady;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] border-0 bg-background/90 p-0 backdrop-blur-xl">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.35),_transparent_58%),linear-gradient(135deg,rgba(99,102,241,0.24),rgba(168,85,247,0.18),rgba(236,72,153,0.12))]" />

          <div className="relative px-6 pb-8 pt-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-purple-400">
                  {content.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                  {content.title}
                </h2>
                <p className="mt-2 max-w-[320px] text-sm leading-6 text-muted-foreground">
                  {content.description}
                </p>
              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/10 shadow-xl backdrop-blur-md">
                <Crown className="h-8 w-8 text-yellow-400" />
              </div>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border/50 bg-card/60 p-3 text-center">
                <Wallet className="mx-auto h-4 w-4 text-emerald-500" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unlimited</p>
                <p className="mt-1 text-sm font-black text-foreground">Goals</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card/60 p-3 text-center">
                <Clock className="mx-auto h-4 w-4 text-sky-500" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full</p>
                <p className="mt-1 text-sm font-black text-foreground">History</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card/60 p-3 text-center">
                <Target className="mx-auto h-4 w-4 text-purple-500" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Smarter</p>
                <p className="mt-1 text-sm font-black text-foreground">Planning</p>
              </div>
            </div>

            <div className="mb-6 rounded-3xl border border-border/50 bg-card/60 p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">
                  What You Unlock
                </p>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Pro
                </span>
              </div>

              <div className="space-y-3">
                {content.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="h-3 w-3" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-purple-400 mb-2">Monthly</p>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-2xl font-black text-foreground">{monthlyPrice}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="text-[10px] text-muted-foreground">7-day free trial</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 relative">
                <div className="absolute -top-2 -right-1">
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-wider shadow-sm">
                    Save 33%
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-400 mb-2">Annual</p>
                <div className="flex items-baseline gap-0.5 mb-1">
                  <span className="text-2xl font-black text-foreground">{yearlyPrice}</span>
                  <span className="text-xs text-muted-foreground">/yr</span>
                </div>
                <p className="text-[10px] text-muted-foreground">7-day free trial</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Try free for 7 days — cancel anytime before you're charged.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <Button
                className={cn(
                  'h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-base font-black shadow-lg shadow-purple-500/20 transition-opacity hover:opacity-95'
                )}
                disabled={purchaseDisabled}
                onClick={() => handleUpgrade('monthly')}
              >
                {checkoutLoading === 'monthly' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Start 7-Day Free Trial — {monthlyPrice}/mo
                {checkoutLoading !== 'monthly' && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                className="h-10 w-full rounded-2xl font-bold text-sm border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 hover:border-emerald-500/50"
                disabled={purchaseDisabled}
                onClick={() => handleUpgrade('yearly')}
              >
                {checkoutLoading === 'yearly' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Annual Plan — {yearlyPrice}/year (save 33%)
              </Button>
              <Button
                variant="ghost"
                className="h-9 w-full rounded-2xl text-xs text-muted-foreground"
                disabled={purchaseDisabled}
                onClick={handleRestore}
              >
                {checkoutLoading === 'restore' ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                )}
                Restore Purchases
              </Button>
              <Button
                variant="ghost"
                className="w-full rounded-2xl text-muted-foreground"
                disabled={purchaseDisabled}
                onClick={() => onOpenChange(false)}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
