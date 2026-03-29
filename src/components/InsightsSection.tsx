import { Skeleton } from '@/components/ui/skeleton';
import { useLocalInsights } from '@/hooks/useLocalInsights';
import { Insight } from '@/types/localAI';
import { TrendingUp, AlertTriangle, Target, Zap, PiggyBank } from 'lucide-react';

/**
 * Displays AI-generated spending insights on dashboard
 * Shows top insights filtered by type
 */
export function InsightsSection() {
  const { insights, loading, error } = useLocalInsights();

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return null; // Silently fail - insights are optional
  }

  // Filter out internal spending_habits and get top insights
  const displayInsights = insights
    .filter(i => i.type !== 'spending_habits')
    .slice(0, 3);

  if (displayInsights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider opacity-70">💡 Insights</h3>
      <div className="space-y-2">
        {displayInsights.map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const iconClass = 'w-4 h-4 flex-shrink-0';

  // Color and icon based on type
  let icon = null;
  let bgColor = 'bg-slate-500/10 border-slate-300/50';
  let textColor = 'text-slate-700 dark:text-slate-300';

  switch (insight.type) {
    case 'predicted_expense':
      icon = <TrendingUp className={iconClass} />;
      bgColor = 'bg-blue-500/10 border-blue-300/50';
      textColor = 'text-blue-700 dark:text-blue-300';
      break;
    case 'anomaly':
      icon = <AlertTriangle className={iconClass} />;
      bgColor = insight.severity && insight.severity > 0.7
        ? 'bg-red-500/10 border-red-300/50'
        : 'bg-amber-500/10 border-amber-300/50';
      textColor = insight.severity && insight.severity > 0.7
        ? 'text-red-700 dark:text-red-300'
        : 'text-amber-700 dark:text-amber-300';
      break;
    case 'savings_optimization':
      icon = <PiggyBank className={iconClass} />;
      bgColor = 'bg-emerald-500/10 border-emerald-300/50';
      textColor = 'text-emerald-700 dark:text-emerald-300';
      break;
    case 'goal_progress':
      icon = <Target className={iconClass} />;
      bgColor = 'bg-indigo-500/10 border-indigo-300/50';
      textColor = 'text-indigo-700 dark:text-indigo-300';
      break;
  }

  return (
    <div
      className={`p-3 rounded-xl border flex gap-3 transition-all ${bgColor}`}
    >
      <div className={`mt-0.5 ${textColor}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textColor}`}>{insight.title}</p>
        <p className={`text-xs mt-1 opacity-75 ${textColor}`}>{insight.description}</p>
      </div>
    </div>
  );
}
