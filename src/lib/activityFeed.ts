import type { TFunction } from 'i18next';
import type { ActivityLog, Transaction } from '@/types';
import { localizeNumber } from '@/lib/i18nNumber';

export type FeedTransaction = Transaction & { convertedAmount?: number };

export type ActivityFeedEntry =
  | { kind: 'activity'; at: number; activity: ActivityLog }
  | { kind: 'transaction'; at: number; tx: FeedTransaction };

const toTime = (value: string) => {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * The activity feed: `activity_log` rows and transactions interleaved by recency.
 * The Dashboard preview is this feed capped at 5; /activity is the same feed uncapped.
 * Keep it in one place — the two screens drifted apart when each built its own.
 */
export function mergeActivityFeed(
  activities: ActivityLog[],
  transactions: FeedTransaction[],
  limit?: number,
): ActivityFeedEntry[] {
  const seen = new Set<string>();
  const entries: ActivityFeedEntry[] = [];

  for (const activity of activities) {
    if (seen.has(`a:${activity.id}`)) continue;
    seen.add(`a:${activity.id}`);
    entries.push({ kind: 'activity', at: toTime(activity.created_at), activity });
  }

  for (const tx of transactions) {
    if (seen.has(`t:${tx.id}`)) continue;
    seen.add(`t:${tx.id}`);
    entries.push({ kind: 'transaction', at: toTime(tx.date), tx });
  }

  entries.sort((a, b) => b.at - a.at);
  return limit === undefined ? entries : entries.slice(0, limit);
}

/**
 * `activity_log.description` is stored either as `key|name|currency|amount` (current
 * writers) or as a plain English sentence (rows written before i18n landed). Both
 * screens render the same rows, so both need the same parser.
 */
export function formatActivityDescription(description: string, t: TFunction): string {
  const fmt = (n: string) =>
    localizeNumber(parseFloat(n), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const parts = description.split('|');
  if (parts.length >= 2) {
    const key = parts[0];
    const params: Record<string, string> = {};
    if (parts[1]) params.name = parts[1];
    if (parts[2]) params.currency = parts[2];
    if (parts[3]) params.amount = fmt(parts[3]);
    return t(`activity.${key}`, params);
  }

  // Fallback: parse legacy English-format strings from the DB.
  let m: RegExpMatchArray | null;
  m = description.match(/^You owe (.+?) ([A-Z]{3}) ([\d.]+)$/);
  if (m) return t('activity.youOwe', { name: m[1], currency: m[2], amount: fmt(m[3]) });
  m = description.match(/^(.+?) owes you ([A-Z]{3}) ([\d.]+)$/);
  if (m) return t('activity.owesYou', { name: m[1], currency: m[2], amount: fmt(m[3]) });
  m = description.match(/^Settled debt to (.+?): ([A-Z]{3}) ([\d.]+)$/);
  if (m) return t('activity.settledDebtTo', { name: m[1], currency: m[2], amount: fmt(m[3]) });
  m = description.match(/^Settled debt from (.+?): ([A-Z]{3}) ([\d.]+)$/);
  if (m) return t('activity.settledDebtFrom', { name: m[1], currency: m[2], amount: fmt(m[3]) });
  m = description.match(/^Paid ([A-Z]{3}) ([\d.]+) towards (.+)$/);
  if (m) return t('activity.paidTowards', { name: m[3], currency: m[1], amount: fmt(m[2]) });
  m = description.match(/^Deleted debt to (.+)$/);
  if (m) return t('activity.deletedDebtTo', { name: m[1] });
  m = description.match(/^Deleted debt from (.+)$/);
  if (m) return t('activity.deletedDebtFrom', { name: m[1] });
  return description;
}
