import { describe, expect, it } from 'vitest';
import { calculateSavingsPace } from '../savings';
import { addDays, addMonths, addWeeks, formatISO, subDays, subMonths, subWeeks } from 'date-fns';

describe('calculateSavingsPace', () => {
  it('returns no_plan when schedule is not enabled', () => {
    const result = calculateSavingsPace({
      target_amount: 1000,
      current_saved: 200,
      deadline: '2026-05-01',
      created_at: '2026-01-01T00:00:00.000Z',
      plan_frequency: null,
      contribution_history: [],
    });

    expect(result.status).toBe('no_plan');
    expect(result.required_per_period).toBe(0);
  });

  it('returns on_track when pace is within tolerance', () => {
    const now = new Date();
    const result = calculateSavingsPace({
      target_amount: 1000,
      current_saved: 400,
      deadline: formatISO(addWeeks(now, 10)),
      created_at: formatISO(subWeeks(now, 4)),
      plan_frequency: 'weekly',
      plan_start_date: formatISO(subWeeks(now, 4), { representation: 'date' }),
      contribution_history: [
        { amount: 70, date: formatISO(subWeeks(now, 4)) },
        { amount: 70, date: formatISO(subWeeks(now, 3)) },
        { amount: 65, date: formatISO(subWeeks(now, 2)) },
        { amount: 65, date: formatISO(subWeeks(now, 1)) },
      ],
    });

    expect(result.status).toBe('on_track');
    expect(result.required_per_period).toBeGreaterThan(0);
  });

  it('returns ahead when current pace exceeds required pace', () => {
    const now = new Date();
    const result = calculateSavingsPace({
      target_amount: 1200,
      current_saved: 600,
      deadline: formatISO(addMonths(now, 3)),
      created_at: formatISO(subMonths(now, 2)),
      plan_frequency: 'monthly',
      plan_start_date: formatISO(subMonths(now, 2), { representation: 'date' }),
      contribution_history: [
        { amount: 300, date: formatISO(subMonths(now, 2)) },
        { amount: 350, date: formatISO(subMonths(now, 1)) },
      ],
    });

    expect(result.status).toBe('ahead');
  });

  it('returns behind with a suggested deadline when pace is too slow', () => {
    const now = new Date();
    const result = calculateSavingsPace({
      target_amount: 1000,
      current_saved: 200,
      deadline: formatISO(addWeeks(now, 4)),
      created_at: formatISO(subWeeks(now, 4)),
      plan_frequency: 'weekly',
      plan_start_date: formatISO(subWeeks(now, 4), { representation: 'date' }),
      contribution_history: [
        { amount: 25, date: formatISO(subWeeks(now, 4)) },
        { amount: 25, date: formatISO(subWeeks(now, 2)) },
      ],
    });

    expect(result.status).toBe('behind');
    expect(result.suggested_deadline).not.toBeNull();
  });

  it('returns completed when saved amount reaches target', () => {
    const now = new Date();
    const result = calculateSavingsPace({
      target_amount: 1000,
      current_saved: 1000,
      deadline: formatISO(addDays(now, 30)),
      created_at: formatISO(subDays(now, 30)),
      plan_frequency: 'daily',
      plan_start_date: formatISO(subDays(now, 30), { representation: 'date' }),
      contribution_history: [],
    });

    expect(result.status).toBe('completed');
    expect(result.periods_remaining).toBe(0);
  });

  it('counts the current and upcoming months in periods_remaining', () => {
    const now = new Date();
    const result = calculateSavingsPace({
      target_amount: 1200,
      current_saved: 0,
      deadline: formatISO(addMonths(now, 3)),
      created_at: formatISO(now),
      plan_frequency: 'monthly',
      plan_start_date: formatISO(now, { representation: 'date' }),
      contribution_history: [],
    });

    expect(result.periods_remaining).toBe(4);
    expect(result.required_per_period).toBe(300);
  });

  it('calculates current period amount from contributions inside the active period only', () => {
    const now = new Date();
    const result = calculateSavingsPace({
      target_amount: 500,
      current_saved: 100,
      deadline: formatISO(addWeeks(now, 4)),
      created_at: formatISO(subWeeks(now, 4)),
      plan_frequency: 'weekly',
      plan_start_date: formatISO(subWeeks(now, 4), { representation: 'date' }),
      contribution_history: [
        { amount: 20, date: formatISO(subWeeks(now, 1)) },
        { amount: 35, date: formatISO(subDays(now, 2)) },
        { amount: 15, date: formatISO(subDays(now, 1)) },
      ],
    });

    expect(result.current_period_amount).toBe(50);
  });
});
