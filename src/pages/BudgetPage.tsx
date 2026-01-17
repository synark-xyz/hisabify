import { useState } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';
import { BudgetDashboard } from '@/components/BudgetDashboard';
import { AddBudgetModal } from '@/components/AddBudgetModal';

export function BudgetPage() {
  const [showAddBudget, setShowAddBudget] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Budget Tracking" />
      
      <main className="px-4 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Budget Tracking</h1>
          <p className="text-muted-foreground">Monitor your spending and stay on track</p>
        </div>

        <BudgetDashboard />
      </main>

      <BottomNavigation onAddClick={() => setShowAddBudget(true)} />
      <AddBudgetModal open={showAddBudget} onOpenChange={setShowAddBudget} />
    </div>
  );
}
