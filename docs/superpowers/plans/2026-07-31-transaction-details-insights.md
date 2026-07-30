# Transaction Details Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add budget impact and merchant pattern insight cards to TransactionDetailsPage.

**Architecture:** Two new inline JSX sections in the existing component, no new components or hooks. Merchant frequency data fetched via a single `useEffect` + `useState` pair. Calculation logic extracted to pure functions in a separate utility file for testability.

**Tech Stack:** React, TypeScript, Supabase, Vitest, date-fns

## Global Constraints

- No new components or hooks — pure inline JSX and state
- Calculations extracted to `src/lib/transactionUtils.ts` for unit-testability
- One lightweight Supabase query for merchant frequency (indexed on `user_id`, `merchant`, `date`)
- Follow existing code style: 2-space indent, semicolons, `@/` imports
- New i18n keys added to `src/i18n/locales/en/translation.json` under `dialogs.transactionDetails`
- Tests use Vitest + Testing Library, same patterns as `AssignmentSheet.test.tsx`

---

### Task 1: Utility functions and tests

**Files:**
- Modify: `src/lib/transactionUtils.ts`
- Create: `src/lib/__tests__/transactionDetailsInsights.test.ts`

**Interfaces:**
- Produces:
  - `computeBudgetImpact(txAmount, budget): { thisTxPercent: number; remainingAfter: number; status: BudgetStatus }`
  - `computeGoalImpact(txAmount, goal): { thisTxPercent: number; remainingAfter: number }`
  - `shouldShowMerchantPattern(count, hasRecurringMatch, ...): boolean`

- [ ] **Step 1: Write failing tests for Budget Impact calculation**

```typescript
// src/lib/__tests__/transactionDetailsInsights.test.ts
import { describe, it, expect } from 'vitest';
import { computeBudgetImpact, computeGoalImpact, shouldShowMerchantPattern } from '@/lib/transactionUtils';

describe('computeBudgetImpact', () => {
  it('calculates correct percentage and remaining', () => {
    const budget = { amount: 1000, spent: 400, remaining: 600, percentage: 40, status: 'safe' as const };
    const result = computeBudgetImpact(50, budget);
    expect(result.thisTxPercent).toBeCloseTo(5, 1);
    expect(result.remainingAfter).toBeCloseTo(550, 1);
    expect(result.status).toBe('safe');
  });

  it('shows warning when transaction pushes budget near limit', () => {
    const budget = { amount: 100, spent: 70, remaining: 30, percentage: 70, status: 'warning' as const };
    const result = computeBudgetImpact(25, budget);
    expect(result.thisTxPercent).toBeCloseTo(25, 1);
    expect(result.remainingAfter).toBeCloseTo(5, 1);
    expect(result.status).toBe('warning');
  });

  it('shows exceeded when transaction overshoots budget', () => {
    const budget = { amount: 100, spent: 80, remaining: 20, percentage: 80, status: 'safe' as const };
    const result = computeBudgetImpact(50, budget);
    expect(result.thisTxPercent).toBeCloseTo(50, 1);
    expect(result.remainingAfter).toBeCloseTo(-30, 1);
    expect(result.status).toBe('exceeded');
  });
});

describe('computeGoalImpact', () => {
  it('calculates correct percentage and remaining', () => {
    const goal = { currentAmount: 350, targetAmount: 500, remaining: 150, percentage: 70 };
    const result = computeGoalImpact(45, goal);
    expect(result.thisTxPercent).toBeCloseTo(9, 1);
    expect(result.remainingAfter).toBeCloseTo(105, 1);
  });

  it('caps percentage at 100', () => {
    const goal = { currentAmount: 450, targetAmount: 500, remaining: 50, percentage: 90 };
    const result = computeGoalImpact(100, goal);
    expect(result.thisTxPercent).toBeCloseTo(20, 1);
    expect(result.remainingAfter).toBeCloseTo(-50, 1);
  });
});

describe('shouldShowMerchantPattern', () => {
  it('shows when count >= 2', () => {
    expect(shouldShowMerchantPattern(3, false)).toBe(true);
  });

  it('shows when has recurring match even with count 1', () => {
    expect(shouldShowMerchantPattern(1, true)).toBe(true);
  });

  it('hides when count is 1 and no recurring match', () => {
    expect(shouldShowMerchantPattern(1, false)).toBe(false);
  });

  it('hides when count is 0', () => {
    expect(shouldShowMerchantPattern(0, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/transactionDetailsInsights.test.ts
```
Expected: FAIL — functions not found

- [ ] **Step 3: Write implementation in transactionUtils.ts**

Append to `src/lib/transactionUtils.ts`:

```typescript
export interface BudgetSnapshot {
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatus;
}

export type BudgetStatus = 'safe' | 'warning' | 'utilized' | 'exceeded';

export function computeBudgetImpact(txAmount: number, budget: BudgetSnapshot): {
  thisTxPercent: number;
  remainingAfter: number;
  status: BudgetStatus;
} {
  const thisTxPercent = budget.amount > 0 ? (txAmount / budget.amount) * 100 : 0;
  const remainingAfter = budget.remaining - txAmount;
  let status: BudgetStatus = budget.status;
  if (remainingAfter < 0 && budget.status === 'safe') {
    status = 'exceeded';
  } else if (remainingAfter < 0 && budget.status !== 'exceeded') {
    status = 'exceeded';
  }
  return { thisTxPercent, remainingAfter, status };
}

export function computeGoalImpact(txAmount: number, goal: {
  currentAmount: number;
  targetAmount: number;
  remaining: number;
  percentage: number;
}): {
  thisTxPercent: number;
  remainingAfter: number;
} {
  const thisTxPercent = goal.targetAmount > 0 ? (txAmount / goal.targetAmount) * 100 : 0;
  const remainingAfter = goal.remaining - txAmount;
  return { thisTxPercent, remainingAfter };
}

export function shouldShowMerchantPattern(
  visitCount: number,
  hasRecurringMatch: boolean
): boolean {
  return visitCount >= 2 || (visitCount >= 1 && hasRecurringMatch);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/transactionDetailsInsights.test.ts
```
Expected: PASS (3 suites, 7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/transactionUtils.ts src/lib/__tests__/transactionDetailsInsights.test.ts
git commit -m "Add budget impact and pattern insight utility functions"
```

---

### Task 2: Budget Impact card in TransactionDetailsPage

**Files:**
- Modify: `src/pages/TransactionDetailsPage.tsx`

**Interfaces:**
- Consumes: `computeBudgetImpact`, `computeGoalImpact` from `transactionUtils.ts`

- [ ] **Step 1: Add imports**

Add to existing imports at top of file:
```typescript
import { computeBudgetImpact, computeGoalImpact } from '@/lib/transactionUtils';
```

- [ ] **Step 2: Compute budget impact values**

Add after line 202 (`const linkedGoal = ...`):
```typescript
const budgetImpact = linkedBudget
  ? computeBudgetImpact(Math.abs(displayAmount), {
      amount: linkedBudget.amount,
      spent: linkedBudget.spent,
      remaining: linkedBudget.remaining,
      percentage: linkedBudget.percentage,
      status: linkedBudget.status,
    })
  : null;

const goalImpact = linkedGoal
  ? computeGoalImpact(Math.abs(displayAmount), {
      currentAmount: linkedGoal.current_amount,
      targetAmount: linkedGoal.target_amount,
      remaining: linkedGoal.remaining,
      percentage: linkedGoal.percentage,
    })
  : null;
```

- [ ] **Step 3: Add Budget Impact JSX after the budget/goal link card**

Insert after line 300 (after the closing `}` of the budget/goal link section, before tags):

```typescript
          {/* Budget Impact */}
          {budgetImpact && (
            <div className="rounded-xl bg-primary/[0.03] border border-primary/10 p-3.5">
              <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                <span>📊</span>
                <span>{t('dialogs.transactionDetails.budgetImpact')}</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold">{formatAmount(Math.abs(displayAmount))}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-muted-foreground">
                  {budgetImpact.thisTxPercent.toFixed(0)}% {t('budget.ofBudget', { amount: linkedBudget!.name || linkedBudget!.category?.name || t('budget.budget') })}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('budget.remainingUsed', { remaining: formatAmount(linkedBudget!.spent), percent: linkedBudget!.percentage.toFixed(0) })}
                {' · '}
                <span className={budgetImpact.remainingAfter < 0 ? 'text-destructive font-medium' : ''}>
                  {t('budget.left')}: {formatAmount(Math.max(0, budgetImpact.remainingAfter))}
                </span>
              </p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    budgetImpact.status === 'exceeded' ? 'bg-destructive' :
                    budgetImpact.status === 'warning' ? 'bg-yellow-500' : 'bg-primary'
                  )}
                  style={{ width: `${Math.min(linkedBudget!.percentage + budgetImpact.thisTxPercent, 100)}%` }}
                />
              </div>
              <p className={cn(
                'text-xs mt-1',
                budgetImpact.status === 'exceeded' ? 'text-destructive' :
                budgetImpact.status === 'warning' ? 'text-yellow-500' : 'text-emerald-500'
              )}>
                {budgetImpact.status === 'exceeded' ? t('budget.statusExceeded') :
                 budgetImpact.status === 'warning' ? t('budget.statusAtRisk') : t('budget.statusPaid')}
              </p>
            </div>
          )}

          {/* Goal Impact */}
          {goalImpact && !budgetImpact && (
            <div className="rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 p-3.5">
              <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                <span>🎯</span>
                <span>{t('dialogs.transactionDetails.goalImpact')}</span>
              </p>
              <p className="text-sm">
                <span className="font-semibold">{formatAmount(Math.abs(displayAmount))}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-muted-foreground">
                  {goalImpact.thisTxPercent.toFixed(0)}% {t('budget.ofBudget', { amount: linkedGoal!.name })}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('dialogs.transactionDetails.goalProgress', {
                  amount: formatAmount(linkedGoal!.current_amount),
                  percent: linkedGoal!.percentage.toFixed(0),
                  remaining: formatAmount(Math.max(0, goalImpact.remainingAfter)),
                })}
              </p>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(linkedGoal!.percentage + goalImpact.thisTxPercent, 100)}%` }}
                />
              </div>
            </div>
          )}
```

- [ ] **Step 4: Run lint to check for errors**

```bash
npm run lint
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/TransactionDetailsPage.tsx
git commit -m "Add budget/goal impact card to transaction details"
```

---

### Task 3: Pattern Insights card

**Files:**
- Modify: `src/pages/TransactionDetailsPage.tsx`

**Interfaces:**
- Consumes: `shouldShowMerchantPattern` from `transactionUtils.ts`
- Internal: `merchantPattern` state, `checkRecurringMatch` function

- [ ] **Step 1: Add import**

Add to existing imports:
```typescript
import { computeBudgetImpact, computeGoalImpact, shouldShowMerchantPattern } from '@/lib/transactionUtils';
```

- [ ] **Step 2: Add merchant pattern state and query**

After the `convertedAmount` useEffect (after line 124), add:

```typescript
  const [merchantPattern, setMerchantPattern] = useState<{
    count: number;
    total: number;
  } | null>(null);
  const [loadingPattern, setLoadingPattern] = useState(false);

  useEffect(() => {
    if (!transaction?.merchant || !user) {
      setMerchantPattern(null);
      return;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let cancelled = false;
    setLoadingPattern(true);

    void supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('merchant', transaction.merchant)
      .eq('type', transaction.type)
      .neq('id', transaction.id)
      .gte('date', monthStart.toISOString())
      .lte('date', monthEnd.toISOString())
      .then(({ data }) => {
        if (cancelled) return;
        if (data && data.length > 0) {
          const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
          setMerchantPattern({ count: data.length, total });
        } else {
          setMerchantPattern({ count: 0, total: 0 });
        }
        setLoadingPattern(false);
      });

    return () => { cancelled = true; };
  }, [transaction?.merchant, transaction?.type, transaction?.id, user]);
```

- [ ] **Step 3: Add import of useRecurringExpenses and recurring match**

Add to imports:
```typescript
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
```

After `const { activeGoals } = useSavingsGoals();` add:
```typescript
  const { recurringExpenses } = useRecurringExpenses();
```

Then after the merchantPattern state, add the computed match:
```typescript
  const hasRecurringMatch = useMemo(() => {
    if (!transaction?.merchant) return false;
    const merchant = transaction.merchant.toLowerCase();
    const amount = Math.abs(Number(transaction.amount));
    return recurringExpenses.some(re => {
      const title = (re.title || '').toLowerCase();
      // Fuzzy match: title contains merchant or vice versa,
      // and amount within ±20%
      const titleMatch = title.includes(merchant) || merchant.includes(title);
      if (!titleMatch) return false;
      const diff = Math.abs(amount - re.amount) / re.amount;
      return diff <= 0.2;
    });
  }, [transaction?.merchant, transaction?.amount, recurringExpenses]);
```

Note: `useRecurringExpenses` returns `{ recurringExpenses, loading, ... }` — verify the actual return fields by reading the hook file if needed.

- [ ] **Step 4: Add Pattern Insights JSX**

After the tags section (after `</div>` on line 313), before the note section:

```typescript
          {/* Pattern Insights */}
          {merchantPattern && !loadingPattern && shouldShowMerchantPattern(merchantPattern.count, hasRecurringMatch) && (
            <div className="rounded-xl bg-accent/[0.03] border border-accent/10 p-3.5">
              <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                <span>📈</span>
                <span>{t('dialogs.transactionDetails.patternInsights')}</span>
              </p>
              <p className="text-sm font-medium">
                {t('dialogs.transactionDetails.merchantVisits', {
                  merchant: transaction.merchant,
                  count: merchantPattern.count + 1,
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('dialogs.transactionDetails.merchantTotal', {
                  total: formatAmount(Math.abs(merchantPattern.total) + Math.abs(displayAmount)),
                  avg: formatAmount((Math.abs(merchantPattern.total) + Math.abs(displayAmount)) / (merchantPattern.count + 1)),
                })}
              </p>
              {hasRecurringMatch && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('dialogs.transactionDetails.recurringMatch')}
                </p>
              )}
            </div>
          )}
```

- [ ] **Step 5: Run lint to check for errors**

```bash
npm run lint
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/TransactionDetailsPage.tsx
git commit -m "Add merchant pattern insights card to transaction details"
```

---

### Task 4: Add i18n keys and add missing imports

**Files:**
- Modify: `src/pages/TransactionDetailsPage.tsx`
- Modify: `src/i18n/locales/en/translation.json`

- [ ] **Step 1: Add i18n keys to translation.json**

Add inside the `dialogs.transactionDetails` block (around line 1558):

```json
    "budgetImpact": "Budget Impact",
    "goalImpact": "Goal Impact",
    "goalProgress": "{{amount}} saved ({{percent}}%) · {{remaining}} to go",
    "patternInsights": "Pattern Insights",
    "merchantVisits": "This month at {{merchant}} · {{count}} visits",
    "merchantTotal": "Total: {{total}} · Avg: {{avg}}/visit",
    "recurringMatch": "Matches a recurring expense"
```

- [ ] **Step 2: Add missing React imports**

Update the React import at line 1 to include `useMemo`:
```typescript
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/TransactionDetailsPage.tsx src/i18n/locales/en/translation.json
git commit -m "Add i18n keys for transaction insights"
```
