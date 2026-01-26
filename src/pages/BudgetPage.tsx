import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, Target } from 'lucide-react';
import { BudgetDashboard } from '@/components/BudgetDashboard';
import { AddBudgetModal } from '@/components/AddBudgetModal';
import { useBudgets } from '@/hooks/useBudgets';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/UpgradeModal';
import { PullToRefresh } from '@/components/PullToRefresh';

export function BudgetPage() {
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { budgets, refetch } = useBudgets();
  const { isPremium } = useSubscription();

  // Listen for transaction updates from the global modal
  useEffect(() => {
    const handleUpdate = () => {
      refetch();
    };

    window.addEventListener('transaction-updated', handleUpdate);
    return () => {
      window.removeEventListener('transaction-updated', handleUpdate);
    };
  }, [refetch]);

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

  const handleAddClick = () => {
    if (!isPremium && budgets.length >= 3) {
      setShowUpgradeModal(true);
    } else {
      setShowAddBudget(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh onRefresh={async () => { await refetch(); }} className="h-full pb-page-content fade-bottom-overlay">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">

          <motion.main
            className="px-4 py-4 space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Hero Section */}
            <motion.div
              variants={itemVariants}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-6 shadow-xl"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-white/80" />
                    <span className="text-white/80 text-sm font-medium">Budget Planner</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-1">Plan Your Finances</h1>
                  <p className="text-white/70 text-sm">Set goals, track spending, stay on target</p>
                </div>
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Target className="w-7 h-7 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Dashboard Content */}
            {!isPremium && (
              <motion.div
                variants={itemVariants}
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-violet-600/10 to-indigo-600/10 border border-violet-500/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-violet-600/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Unlimited Budgets</p>
                    <p className="text-xs text-muted-foreground">Upgrade to Pro to create more than 3 budgets</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            )}

            <motion.div variants={itemVariants}>
              <BudgetDashboard />
            </motion.div>
          </motion.main>
        </div>
      </PullToRefresh>

      <AddBudgetModal
        open={showAddBudget}
        onOpenChange={setShowAddBudget}
        onSuccess={() => {
          refetch();
          // Also dispatch global event just in case
          window.dispatchEvent(new Event('transaction-updated'));
        }}
      />
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

    </div>
  );
}
