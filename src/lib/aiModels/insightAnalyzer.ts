import { LocalTransaction, Insight } from '@/types/localAI';
import { logger } from '@/lib/logger';
import { isWithinInterval, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Analyze transactions and generate insights
 */
export async function analyzeTransactions(
  transactions: LocalTransaction[],
  categories: Array<{ id: string; name: string }> = [],
  userSavingsGoals: Array<{ id: string; name: string; target_amount: number; current_amount: number; target_date: string }> = []
): Promise<Insight[]> {
  const insights: Insight[] = [];

  try {
    // 1. Predicted Expenses
    const predictedInsights = generatePredictedExpenses(transactions, categories);
    insights.push(...predictedInsights);

    // 2. Anomaly Detection
    const anomalyInsights = generateAnomalies(transactions, categories);
    insights.push(...anomalyInsights);

    // 3. Savings Rate Optimization
    const savingsInsights = generateSavingsOptimization(transactions, categories);
    insights.push(...savingsInsights);

    // 4. Goal Tracking Progress
    const goalInsights = generateGoalProgress(transactions, userSavingsGoals);
    insights.push(...goalInsights);

    // 5. Spending Habits (internal - for AI knowledgebase)
    const habitInsights = generateSpendingHabits(transactions, categories);
    insights.push(...habitInsights);

    logger.debug(`Generated ${insights.length} insights`);
    return insights;
  } catch (err) {
    logger.error('Failed to analyze transactions', err);
    return [];
  }
}

/**
 * 1. Predicted Expenses
 * Forecast next period spending based on historical patterns
 */
function generatePredictedExpenses(
  transactions: LocalTransaction[],
  categories: Array<{ id: string; name: string }>
): Insight[] {
  const insights: Insight[] = [];

  if (transactions.length < 5) {
    return insights; // Not enough data
  }

  // Group by category
  const byCategory = new Map<string, LocalTransaction[]>();
  for (const tx of transactions) {
    if (tx.category_id) {
      const list = byCategory.get(tx.category_id) || [];
      list.push(tx);
      byCategory.set(tx.category_id, list);
    }
  }

  const now = new Date();
  const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
  const lastMonth = {
    start: startOfMonth(subDays(now, 30)),
    end: endOfMonth(subDays(now, 30)),
  };

  // Calculate average spending per category
  for (const [categoryId, txs] of byCategory) {
    const category = categories.find(c => c.id === categoryId);
    if (!category || txs.length < 2) continue;

    const thisMonthTx = txs.filter(tx => isWithinInterval(new Date(tx.date), thisMonth));
    const lastMonthTx = txs.filter(tx => isWithinInterval(new Date(tx.date), lastMonth));

    if (thisMonthTx.length > 0 || lastMonthTx.length > 0) {
      const thisMonthTotal = thisMonthTx.reduce((sum, tx) => sum + tx.amount, 0);
      const lastMonthTotal = lastMonthTx.reduce((sum, tx) => sum + tx.amount, 0);
      const avgMonthly = (thisMonthTotal + lastMonthTotal) / 2;

      // Calculate days remaining in month
      const daysInMonth = endOfMonth(now).getDate();
      const daysElapsed = now.getDate();
      const daysRemaining = daysInMonth - daysElapsed;

      // Projection: (current + (remaining/elapsed * current))
      const projectedTotal = thisMonthTotal + (daysRemaining / daysElapsed) * thisMonthTotal;

      if (projectedTotal > 0) {
        insights.push({
          id: `predicted-${categoryId}-${now.toISOString().split('T')[0]}`,
          type: 'predicted_expense',
          categoryId,
          categoryName: category.name,
          title: `${category.name}: Projected $${projectedTotal.toFixed(0)} this month`,
          description: `Based on your spending pattern, you'll likely spend ~$${projectedTotal.toFixed(0)} on ${category.name} by month end.`,
          severity: projectedTotal > avgMonthly * 1.2 ? 0.7 : 0.3,
          metadata: {
            predictedAmount: projectedTotal,
            currentAmount: thisMonthTotal,
            previousAmount: lastMonthTotal,
          },
        });
      }
    }
  }

  return insights.slice(0, 3); // Top 3 predictions
}

/**
 * 2. Anomaly Detection
 * Flag unusual spending spikes
 */
function generateAnomalies(
  transactions: LocalTransaction[],
  categories: Array<{ id: string; name: string }>
): Insight[] {
  const insights: Insight[] = [];

  if (transactions.length < 10) {
    return insights; // Not enough data
  }

  // Group by category
  const byCategory = new Map<string, LocalTransaction[]>();
  for (const tx of transactions) {
    if (tx.category_id) {
      const list = byCategory.get(tx.category_id) || [];
      list.push(tx);
      byCategory.set(tx.category_id, list);
    }
  }

  const now = new Date();
  const thisWeek = { start: startOfWeek(now), end: endOfWeek(now) };
  const averagePeriod = subDays(now, 30);

  // Detect spikes
  for (const [categoryId, txs] of byCategory) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) continue;

    const thisWeekTx = txs.filter(tx => isWithinInterval(new Date(tx.date), thisWeek));
    const averageTx = txs.filter(tx => new Date(tx.date) >= averagePeriod && new Date(tx.date) < now);

    if (thisWeekTx.length > 0 && averageTx.length > 2) {
      const thisWeekTotal = thisWeekTx.reduce((sum, tx) => sum + tx.amount, 0);
      const avgWeekly = averageTx.reduce((sum, tx) => sum + tx.amount, 0) / 4; // 4 weeks

      const percentChange = ((thisWeekTotal - avgWeekly) / avgWeekly) * 100;

      if (percentChange > 50) {
        // 50% spike
        const severity = Math.min(1, percentChange / 200); // 200% = severity 1.0

        insights.push({
          id: `anomaly-${categoryId}-${now.toISOString().split('T')[0]}`,
          type: 'anomaly',
          categoryId,
          categoryName: category.name,
          title: `⚠️ ${category.name}: Unusual spending spike!`,
          description: `You spent $${thisWeekTotal.toFixed(0)} on ${category.name} this week (usually ~$${avgWeekly.toFixed(0)}). That's +${percentChange.toFixed(0)}%!`,
          severity,
          metadata: {
            currentAmount: thisWeekTotal,
            previousAmount: avgWeekly,
            percentChange,
            anomalySeverity: severity,
          },
        });
      }
    }
  }

  return insights.sort((a, b) => (b.severity || 0) - (a.severity || 0)).slice(0, 3);
}

/**
 * 3. Savings Rate Optimization
 * Suggest categories to cut for better savings
 */
function generateSavingsOptimization(
  transactions: LocalTransaction[],
  categories: Array<{ id: string; name: string }>
): Insight[] {
  const insights: Insight[] = [];

  if (transactions.length < 10) {
    return insights; // Not enough data
  }

  // Calculate current spending
  const totalSpending = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const avgMonthly = totalSpending / Math.max(1, transactions.length / 30);

  // Target: 20% savings rate (user keeps 80%, saves 20%)
  const targetSavingsRate = 0.20;
  const estimatedIncome = avgMonthly / 0.8; // Assume 20% savings rate should be achievable
  const targetSpending = estimatedIncome * (1 - targetSavingsRate);
  const currentSavings = estimatedIncome - avgMonthly;
  const currentSavingsRate = currentSavings / estimatedIncome;

  if (currentSavingsRate < targetSavingsRate && totalSpending > 0) {
    // Find biggest spending categories
    const byCategory = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.category_id) {
        byCategory.set(tx.category_id, (byCategory.get(tx.category_id) || 0) + tx.amount);
      }
    }

    const sorted = Array.from(byCategory.entries())
      .map(([catId, amount]) => ({
        categoryId: catId,
        categoryName: categories.find(c => c.id === catId)?.name || catId,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Suggest cutting top category
    if (sorted.length > 0) {
      const topCategory = sorted[0];
      const currentRate = (currentSavingsRate * 100).toFixed(1);
      const targetRate = (targetSavingsRate * 100).toFixed(0);
      const recommendedCut = Math.max(0, targetSpending - avgMonthly);

      insights.push({
        id: `savings-optimization-${new Date().toISOString().split('T')[0]}`,
        type: 'savings_optimization',
        categoryId: topCategory.categoryId,
        categoryName: topCategory.categoryName,
        title: `💰 Boost savings rate from ${currentRate}% to ${targetRate}%`,
        description: `Cut ${topCategory.categoryName} spending by $${recommendedCut.toFixed(0)}/month to reach your savings goal.`,
        severity: 0.5,
        metadata: {
          percentChange: -((recommendedCut / topCategory.amount) * 100),
          currentAmount: topCategory.amount,
        },
      });
    }
  }

  return insights;
}

/**
 * 4. Goal Tracking Progress
 * Monitor progress toward savings goals
 */
function generateGoalProgress(
  transactions: LocalTransaction[],
  userSavingsGoals: Array<{ id: string; name: string; target_amount: number; current_amount: number; target_date: string }>
): Insight[] {
  const insights: Insight[] = [];

  if (userSavingsGoals.length === 0) {
    return insights; // No goals set
  }

  const now = new Date();

  for (const goal of userSavingsGoals) {
    const targetDate = new Date(goal.target_date);
    const daysRemaining = Math.max(0, (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const percentToGoal = (goal.current_amount / goal.target_amount) * 100;
    const statusColor = percentToGoal >= 100 ? '✅' : percentToGoal >= 70 ? '🟡' : '🔴';
    const onTrack = percentToGoal >= (100 * now.getTime() / targetDate.getTime()) * 100;

    let status = 'On track';
    if (percentToGoal >= 100) {
      status = 'Goal reached!';
    } else if (percentToGoal < (100 * now.getTime() / targetDate.getTime()) * 100) {
      status = 'Behind schedule';
    }

    insights.push({
      id: `goal-progress-${goal.id}`,
      type: 'goal_progress',
      title: `${statusColor} ${goal.name}: $${goal.current_amount.toFixed(0)}/$${goal.target_amount.toFixed(0)}`,
      description: `${percentToGoal.toFixed(0)}% complete • ${status} • ${Math.ceil(daysRemaining)} days remaining`,
      severity: onTrack ? 0.2 : 0.8,
      metadata: {
        percentToGoal,
        currentAmount: goal.current_amount,
        targetAmount: goal.target_amount,
      },
    });
  }

  return insights;
}

/**
 * 5. Spending Habits (Internal - for AI knowledgebase)
 * Detect patterns for future model training
 */
function generateSpendingHabits(
  transactions: LocalTransaction[],
  categories: Array<{ id: string; name: string }>
): Insight[] {
  const insights: Insight[] = [];

  if (transactions.length < 5) {
    return insights;
  }

  // Group by category
  const byCategory = new Map<string, LocalTransaction[]>();
  for (const tx of transactions) {
    if (tx.category_id) {
      const list = byCategory.get(tx.category_id) || [];
      list.push(tx);
      byCategory.set(tx.category_id, list);
    }
  }

  // Calculate frequency per category
  for (const [categoryId, txs] of byCategory) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) continue;

    const daysSpan = txs.length > 1 ? (new Date(txs[0].date).getTime() - new Date(txs[txs.length - 1].date).getTime()) / (1000 * 60 * 60 * 24) : 1;
    const frequencyPerWeek = (txs.length / daysSpan) * 7;
    const avgAmount = txs.reduce((sum, tx) => sum + tx.amount, 0) / txs.length;

    // This insight is marked as 'spending_habits' for internal tracking
    // Not shown to user, only used for AI knowledgebase
    insights.push({
      id: `habits-${categoryId}-${new Date().toISOString().split('T')[0]}`,
      type: 'spending_habits',
      categoryId,
      categoryName: category.name,
      title: `Spending Habit: ${category.name}`,
      description: `${txs.length} transactions in ${daysSpan.toFixed(0)} days. Frequency: ${frequencyPerWeek.toFixed(1)}/week, Avg: $${avgAmount.toFixed(0)}`,
      severity: 0,
      metadata: {
        frequencyScore: frequencyPerWeek,
        transactionCount: txs.length,
        averageAmount: avgAmount,
        daysCovered: daysSpan,
      },
    });
  }

  return insights;
}
