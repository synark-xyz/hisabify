import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Crown, Sparkles, Target, TrendingUp, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

const DEFAULT_BENEFITS = [
  'Unlimited budgets and savings goals',
  'Advanced analytics and period comparisons',
  'Savings automation and full history',
  'Multi-currency and premium planning tools',
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
  if (matched) {
    return {
      ...matched,
      benefits: matched.benefits || DEFAULT_BENEFITS,
    };
  }

  return {
    eyebrow: 'Hisabify Pro',
    title: 'Upgrade to Pro',
    description: 'Unlock the full Hisabify experience with better planning, deeper insights, and fewer limits.',
    benefits: DEFAULT_BENEFITS,
  };
}

export function UpgradeModal({ open, onOpenChange, source }: UpgradeModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const content = getUpgradeContent(source);

  const handleUpgrade = () => {
    onOpenChange(false);
    toast({
      title: 'Pro checkout is not enabled yet',
      description: 'Contact support to activate Pro manually for now.',
    });
    navigate('/support');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] overflow-hidden border-0 bg-background/90 p-0 backdrop-blur-xl">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.35),_transparent_58%),linear-gradient(135deg,rgba(99,102,241,0.24),rgba(168,85,247,0.18),rgba(236,72,153,0.12))]" />

          <div className="relative px-6 pb-6 pt-6">
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
                <TrendingUp className="mx-auto h-4 w-4 text-sky-500" />
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deeper</p>
                <p className="mt-1 text-sm font-black text-foreground">Insights</p>
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

            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-purple-400">Hisabify Pro</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">$4.99</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Manual activation for now. Billing flow comes next.
                  </p>
                </div>

                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Button
                className={cn(
                  'h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-base font-black shadow-lg shadow-purple-500/20 transition-opacity hover:opacity-95'
                )}
                onClick={handleUpgrade}
              >
                Upgrade to Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full rounded-2xl text-muted-foreground"
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
