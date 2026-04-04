import { PullToRefresh } from '@/components/PullToRefresh';
import { SavingsTabContent } from '@/components/savings/SavingsTabContent';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';

export default function SavingsPage() {
  const { refetch } = useSavingsGoals();
  return (
    <PullToRefresh onRefresh={refetch}>
      <SavingsTabContent />
    </PullToRefresh>
  );
}
