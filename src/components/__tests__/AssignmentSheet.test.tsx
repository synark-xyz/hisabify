import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssignmentSheet } from '@/components/AssignmentSheet';
import type { SavingsGoalWithProgress } from '@/hooks/useSavingsGoals';

// savings_goals.icon stores an icon *name* ("target", hardcoded in SavingsTabContent),
// not an emoji. Rendering {goal.icon} printed the literal word "target" inside the
// goal avatar. Guard that it never comes back as text.

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatAmount: (n: number) => `¥${n}` }),
}));

const goal = {
  id: 'g1',
  name: 'Emergency Fund',
  icon: 'target',
  color: '#e8c39e',
  percentage: 5,
  remaining: 19000,
  isArchived: false,
} as unknown as SavingsGoalWithProgress;

describe('AssignmentSheet', () => {
  it('renders a goal icon, not the raw icon name', () => {
    render(
      <AssignmentSheet
        open
        onOpenChange={() => {}}
        budgets={[]}
        goals={[goal]}
        currentBudgetId={null}
        currentGoalId={null}
        onSelectBudget={() => {}}
        onSelectGoal={() => {}}
        onUnlink={() => {}}
      />,
    );

    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.queryByText('target')).not.toBeInTheDocument();
  });
});
