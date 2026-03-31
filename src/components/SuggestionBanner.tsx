import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { SmartSuggestion } from '@/hooks/useSmartSuggest';
import type { BudgetWithSpending } from '@/hooks/useBudgets';
import type { SavingsGoalWithProgress } from '@/hooks/useSavingsGoals';
import { AssignmentSheet } from '@/components/AssignmentSheet';
import { cn } from '@/lib/utils';

interface SuggestionBannerProps {
  suggestion: SmartSuggestion;
  linkedBudgetId: string | null;
  linkedGoalId: string | null;
  budgets: BudgetWithSpending[];
  goals: SavingsGoalWithProgress[];
  onConfirm: (type: 'budget' | 'goal', id: string) => void;
  onUnlink: () => void;
}

export function SuggestionBanner({
  suggestion,
  linkedBudgetId,
  linkedGoalId,
  budgets,
  goals,
  onConfirm,
  onUnlink,
}: SuggestionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [suggestion]);

  const isLinked = linkedBudgetId !== null || linkedGoalId !== null;

  // Find the currently linked entity for display
  const linkedBudget = linkedBudgetId ? budgets.find(b => b.id === linkedBudgetId) : null;
  const linkedGoal = linkedGoalId ? goals.find(g => g.id === linkedGoalId) : null;
  const linkedName = linkedBudget?.name || linkedBudget?.category?.name || linkedGoal?.name;
  const linkedIcon = linkedGoal?.icon ?? '📊';

  // Show confirmed chip when something is linked
  if (isLinked) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-1 mt-1"
        >
          <span className="text-xs text-muted-foreground">Linked to</span>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1 text-xs text-primary font-medium"
          >
            <span>{linkedIcon}</span>
            <span>{linkedName}</span>
          </button>
          <button
            onClick={onUnlink}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove link"
          >
            <X size={13} />
          </button>
        </motion.div>

        <AssignmentSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          budgets={budgets}
          goals={goals}
          currentBudgetId={linkedBudgetId}
          currentGoalId={linkedGoalId}
          onSelectBudget={id => onConfirm('budget', id)}
          onSelectGoal={id => onConfirm('goal', id)}
          onUnlink={onUnlink}
        />
      </>
    );
  }

  // Show "Link to…" row after dismiss
  if (dismissed || !suggestion) {
    if (!budgets.length && !goals.length) return null;
    return (
      <>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 px-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-base">🎯</span>
          <span>Link to budget or goal…</span>
        </button>
        <AssignmentSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          budgets={budgets}
          goals={goals}
          currentBudgetId={null}
          currentGoalId={null}
          onSelectBudget={id => onConfirm('budget', id)}
          onSelectGoal={id => onConfirm('goal', id)}
          onUnlink={onUnlink}
        />
      </>
    );
  }

  // Show the smart suggestion banner
  const isBudgetSuggestion = suggestion.type === 'budget';
  const item = suggestion.item;
  const name = isBudgetSuggestion
    ? ((item as BudgetWithSpending).name || (item as BudgetWithSpending).category?.name || 'Budget')
    : (item as SavingsGoalWithProgress).name;
  const meta = isBudgetSuggestion
    ? `${(item as BudgetWithSpending).remaining.toFixed(0)} remaining · ${(item as BudgetWithSpending).percentage}% used`
    : `${(item as SavingsGoalWithProgress).percentage.toFixed(0)}% saved · ${(item as SavingsGoalWithProgress).remaining.toFixed(0)} to go`;
  const icon = isBudgetSuggestion ? '📊' : (item as SavingsGoalWithProgress).icon;

  return (
    <AnimatePresence>
      <motion.div
        key="suggestion-banner"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        className={cn(
          'mt-2 rounded-xl border p-3',
          'bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20'
        )}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{meta}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onConfirm(suggestion.type, item.id)}
                className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg font-medium"
              >
                ✓ Link it
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="text-xs text-muted-foreground border border-border px-3 py-1 rounded-lg"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
