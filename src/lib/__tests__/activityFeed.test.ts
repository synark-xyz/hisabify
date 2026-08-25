import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { mergeActivityFeed, formatActivityDescription } from '@/lib/activityFeed';
import type { ActivityLog, Transaction } from '@/types';

const activity = (id: string, created_at: string, activity_type = 'debt_created') =>
  ({ id, created_at, activity_type, entity_type: 'debt', description: '' } as unknown as ActivityLog);

const tx = (id: string, date: string) => ({ id, date } as unknown as Transaction);

// t() stub: echoes the key plus its params so assertions can see both.
const t = ((key: string, params?: Record<string, string>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key) as unknown as TFunction;

describe('mergeActivityFeed', () => {
  it('interleaves both sources newest first', () => {
    const feed = mergeActivityFeed(
      [activity('a1', '2026-01-03T10:00:00Z'), activity('a2', '2026-01-01T10:00:00Z')],
      [tx('t1', '2026-01-04T10:00:00Z'), tx('t2', '2026-01-02T10:00:00Z')],
    );
    expect(feed.map((e) => (e.kind === 'activity' ? e.activity.id : e.tx.id))).toEqual([
      't1', 'a1', 't2', 'a2',
    ]);
    expect(feed.map((e) => e.kind)).toEqual(['transaction', 'activity', 'transaction', 'activity']);
  });

  it('applies the limit after sorting, so the preview is the head of the full feed', () => {
    const activities = [activity('a1', '2026-01-01T10:00:00Z')];
    const transactions = [tx('t1', '2026-01-05T10:00:00Z'), tx('t2', '2026-01-04T10:00:00Z')];
    const full = mergeActivityFeed(activities, transactions);
    expect(mergeActivityFeed(activities, transactions, 2)).toEqual(full.slice(0, 2));
  });

  it('dedupes repeated ids within each source', () => {
    const feed = mergeActivityFeed(
      [activity('a1', '2026-01-03T10:00:00Z'), activity('a1', '2026-01-03T10:00:00Z')],
      [tx('t1', '2026-01-04T10:00:00Z'), tx('t1', '2026-01-04T10:00:00Z')],
    );
    expect(feed).toHaveLength(2);
  });

  it('keeps an activity and a transaction that happen to share an id', () => {
    const feed = mergeActivityFeed([activity('x', '2026-01-03T10:00:00Z')], [tx('x', '2026-01-04T10:00:00Z')]);
    expect(feed).toHaveLength(2);
  });

  it('handles empty inputs and either source being empty', () => {
    expect(mergeActivityFeed([], [])).toEqual([]);
    expect(mergeActivityFeed([], [tx('t1', '2026-01-04T10:00:00Z')])).toHaveLength(1);
    expect(mergeActivityFeed([activity('a1', '2026-01-04T10:00:00Z')], [])).toHaveLength(1);
  });

  it('sorts unparseable dates last instead of producing NaN comparisons', () => {
    const feed = mergeActivityFeed([activity('a1', 'not-a-date')], [tx('t1', '2026-01-04T10:00:00Z')]);
    expect(feed.map((e) => e.at)).toEqual([new Date('2026-01-04T10:00:00Z').getTime(), 0]);
  });
});

describe('formatActivityDescription', () => {
  it('parses the key|param format', () => {
    expect(formatActivityDescription('youOwe|Rahim|BDT|1200', t)).toBe('activity.youOwe:Rahim,BDT,1,200.00');
  });

  it('parses a key with no amount', () => {
    expect(formatActivityDescription('deletedDebtTo|Karim', t)).toBe('activity.deletedDebtTo:Karim');
  });

  it('parses legacy English rows written before i18n', () => {
    expect(formatActivityDescription('You owe Rahim BDT 1200.00', t)).toBe('activity.youOwe:Rahim,BDT,1,200.00');
    expect(formatActivityDescription('Rahim owes you USD 50.00', t)).toBe('activity.owesYou:Rahim,USD,50.00');
    expect(formatActivityDescription('Settled debt to Rahim: USD 50.00', t)).toBe('activity.settledDebtTo:Rahim,USD,50.00');
    expect(formatActivityDescription('Deleted debt from Karim', t)).toBe('activity.deletedDebtFrom:Karim');
  });

  it('passes through anything it cannot parse', () => {
    expect(formatActivityDescription('Some future activity', t)).toBe('Some future activity');
  });
});
