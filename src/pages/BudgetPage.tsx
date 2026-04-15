import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Crown, Sparkles, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BudgetDashboard } from '@/components/BudgetDashboard';
import { useBudgets } from '@/hooks/useBudgets';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { useTransactionUpdateListener } from '@/hooks/useTransactionUpdateListener';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SavingsTabContent } from '@/components/savings/SavingsTabContent';

export function BudgetPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'goals' ? 'goals' : 'budget';
  const { refetch } = useBudgets();
  const { isPremium } = useSubscription();
  const { variant } = useTheme();
  const { t } = useTranslation();

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useTransactionUpdateListener(() => {
    refetch({ fireAlerts: true });
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className={cn("min-h-screen relative", variant === 'cyberpunk' ? "bg-transparent" : "bg-background")}>
      <PullToRefresh onRefresh={async () => { await refetch(); }} className="h-full pb-page-content fade-bottom-overlay">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">

          <motion.main
            className="py-4 space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Hero Section */}
            <motion.div
              variants={itemVariants}
              className="mx-4 relative overflow-hidden rounded-3xl glass-card-accent p-6"
            >
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <span className="text-muted-foreground text-sm font-medium">{t('budget.managerLabel')}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-1">{t('budget.planYourFinances')}</h1>
                  <p className="text-muted-foreground text-sm">{t('budget.planYourFinancesDesc')}</p>
                </div>
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Target className="w-7 h-7 text-accent" />
                </motion.div>
              </div>
            </motion.div>

            <Tabs defaultValue={defaultTab} className="w-full">
              <motion.div variants={itemVariants} className="px-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="budget">{t('budget.tabBudget')}</TabsTrigger>
                  <TabsTrigger value="goals">{t('budget.tabGoals')}</TabsTrigger>
                </TabsList>
              </motion.div>

              <TabsContent value="budget">
                <motion.div variants={itemVariants} className="px-4 space-y-6">
                  {/* Dashboard Content */}
                  {!isPremium && (
                    <motion.div
                      variants={itemVariants}
                      onClick={() => setShowUpgradeModal(true)}
                      className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-fuchsia-600/10 p-4 cursor-pointer transition-colors hover:bg-violet-600/5"
                    >
                      <div className="absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.16),transparent_70%)]" />
                      <div className="relative flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
                            <Crown className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center gap-2">
                              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-400">
                                Pro
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-400">
                                {t('budget.budgetPlanning')}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-foreground">{t('budget.unlimitedBudgets')}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('budget.unlimitedBudgetsDesc')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-violet-400">
                          <span className="hidden text-xs font-bold uppercase tracking-wider sm:inline">{t('budget.seePro')}</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <BudgetDashboard />
                </motion.div>
              </TabsContent>

              <TabsContent value="goals">
                <SavingsTabContent />
              </TabsContent>
            </Tabs>
          </motion.main>
        </div>
      </PullToRefresh>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} source="budget_limit" />

    </div>
  );
}
