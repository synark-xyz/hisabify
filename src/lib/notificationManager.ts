import { toast } from 'sonner';
import { getISOWeek, getISOWeekYear } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface AppNotification {
  id: string;
  type: 'budget_warning' | 'budget_exceeded' | 'goal_milestone' | 'goal_completed' | 'push_notification' | 'health_weekly' | 'weekly_tip';
  title: string;
  description: string;
  amount?: number;
  percentage?: number;
  deep_link?: string;
  image?: string;
  metadata?: Record<string, string>;
  created_at: string;
  read: boolean;
}

// In-memory flag synced from NotificationSettingsPage on load/change.
// Defaults to true so alerts work before the settings page has been visited.
let _budgetAlertsEnabled = true;

export function setBudgetAlertsEnabled(enabled: boolean): void {
  _budgetAlertsEnabled = enabled;
}

// Dispatch whenever notifications change so any subscribed component can re-read.
function dispatchNotificationsChanged() {
  window.dispatchEvent(new CustomEvent('hisabify:notifications-changed'));
}

// ---------------------------------------------------------------------------
// Core DB operations
// ---------------------------------------------------------------------------

/** Fetch all notifications for a user, newest first. */
export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data ?? []).map(mapRow);
}

/** Insert a notification row. */
async function insertNotification(
  userId: string,
  notification: Omit<AppNotification, 'id' | 'created_at' | 'read'>,
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: notification.type,
    title: notification.title,
    description: notification.description,
    amount: notification.amount ?? null,
    percentage: notification.percentage ?? null,
    deep_link: notification.deep_link ?? null,
    image: notification.image ?? null,
    metadata: notification.metadata ? notification.metadata as unknown as Record<string, unknown> : null,
    read: false,
  });

  if (error) {
    console.error('Error inserting notification:', error);
    return;
  }

  dispatchNotificationsChanged();
}

/** Mark a single notification as read. */
export async function markNotificationAsRead(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) console.error('Error marking notification as read:', error);
  dispatchNotificationsChanged();
}

/** Mark all notifications as read. */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) console.error('Error marking all as read:', error);
  dispatchNotificationsChanged();
}

/** Permanently delete a single notification. */
export async function deleteNotification(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) console.error('Error deleting notification:', error);
  dispatchNotificationsChanged();
}

/** Permanently delete all notifications for a user. */
export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) console.error('Error clearing notifications:', error);
  dispatchNotificationsChanged();
}

/** Delete notifications older than 30 days. */
export async function clearOldNotifications(userId: string): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', thirtyDaysAgo);

  if (error) console.error('Error clearing old notifications:', error);
}

// ---------------------------------------------------------------------------
// Push notifications (from FCM) with deduplication
// ---------------------------------------------------------------------------

// Normalize a deeplink from FCM data to a React Router path.
function resolveDeepLink(raw: string): string {
  if (!raw) return '';
  const stripped = raw.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

export async function addPushNotification(
  userId: string,
  title: string,
  body: string,
  rawDeepLink?: string,
  metadata?: Record<string, string>,
  notificationId?: string,
): Promise<void> {
  // Dedup by Capacitor notification ID when available
  if (notificationId) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'push_notification')
      .contains('metadata', { fcm_notification_id: notificationId })
      .limit(1);

    if (existing && existing.length > 0) return;
  } else {
    // Fallback: skip if identical push stored in the last 60 seconds
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'push_notification')
      .eq('title', title)
      .eq('description', body)
      .gte('created_at', sixtySecondsAgo)
      .limit(1);

    if (existing && existing.length > 0) return;
  }

  const deepLink = rawDeepLink ? resolveDeepLink(rawDeepLink) : undefined;
  // Extract image URL from common FCM keys
  const image = metadata?.['image'] ?? metadata?.['imageUrl'] ?? metadata?.['image_url'] ?? metadata?.['fcm_options.image'] ?? undefined;
  // Filter out title/body/message/image keys from metadata
  const IMAGE_KEYS = ['image', 'imageUrl', 'image_url', 'fcm_options.image'];
  const EXCLUDED_KEYS = ['title', 'body', 'message', ...IMAGE_KEYS];
  const filteredMeta: Record<string, string> = {};
  if (notificationId) filteredMeta['fcm_notification_id'] = notificationId;
  if (metadata) {
    for (const [k, v] of Object.entries(metadata)) {
      if (!EXCLUDED_KEYS.includes(k)) filteredMeta[k] = v;
    }
  }
  const hasMeta = Object.keys(filteredMeta).length > 0;

  await insertNotification(userId, {
    type: 'push_notification',
    title,
    description: body,
    deep_link: deepLink,
    image,
    metadata: hasMeta ? filteredMeta : undefined,
  });
}

// ---------------------------------------------------------------------------
// Domain-specific notification generators
// ---------------------------------------------------------------------------

/** Show budget warning (once per day per budget, via localStorage dedup key). */
export async function showBudgetWarning(userId: string, budgetName: string, percentage: number, periodType: string): Promise<void> {
  if (!_budgetAlertsEnabled) return;
  const alertKey = `budget-warning-${budgetName}-${new Date().toDateString()}`;
  if (localStorage.getItem(alertKey)) return;

  localStorage.setItem(alertKey, 'true');

  toast.warning(`Budget Warning: ${budgetName}`, {
    description: `You've used ${percentage.toFixed(0)}% of your ${periodType} budget.`,
  });

  await insertNotification(userId, {
    type: 'budget_warning',
    title: `Budget Warning: ${budgetName}`,
    description: `You've used ${percentage.toFixed(0)}% of your ${periodType} budget.`,
    percentage,
  });
}

/** Show budget exceeded (once per day per budget). */
export async function showBudgetExceeded(userId: string, budgetName: string, percentage: number, periodType: string): Promise<void> {
  if (!_budgetAlertsEnabled) return;
  const alertKey = `budget-exceeded-${budgetName}-${new Date().toDateString()}`;
  if (localStorage.getItem(alertKey)) return;

  localStorage.setItem(alertKey, 'true');

  toast.error(`Budget Exceeded: ${budgetName}`, {
    description: `You've spent ${percentage.toFixed(0)}% of your ${periodType} budget.`,
  });

  await insertNotification(userId, {
    type: 'budget_exceeded',
    title: `Budget Exceeded: ${budgetName}`,
    description: `You've spent ${percentage.toFixed(0)}% of your ${periodType} budget.`,
    percentage,
  });
}

/** Show goal milestone. */
export async function showGoalMilestone(userId: string, goalName: string, percentage: number, amount: number): Promise<void> {
  const milestones = [25, 50, 75, 90];
  const milestone = milestones.find(m => percentage >= m && percentage < m + 5);

  if (milestone) {
    const alertKey = `goal-milestone-${goalName}-${milestone}`;
    if (localStorage.getItem(alertKey)) return;

    localStorage.setItem(alertKey, 'true');

    toast.success(`Savings Milestone: ${goalName}`, {
      description: `You're ${percentage.toFixed(0)}% of the way to your goal!`,
    });

    await insertNotification(userId, {
      type: 'goal_milestone',
      title: `Savings Milestone: ${goalName}`,
      description: `You're ${percentage.toFixed(0)}% of the way to your goal!`,
      amount,
      percentage,
    });
  }
}

/** Show goal completed. */
export async function showGoalCompleted(userId: string, goalName: string, amount: number): Promise<void> {
  const alertKey = `goal-completed-${goalName}`;
  if (localStorage.getItem(alertKey)) return;

  localStorage.setItem(alertKey, 'true');

  toast.success(`Goal Achieved: ${goalName}`, {
    description: `Congratulations! You've reached your savings goal!`,
  });

  await insertNotification(userId, {
    type: 'goal_completed',
    title: `Goal Achieved: ${goalName}`,
    description: `Congratulations! You've reached your savings goal!`,
    amount,
    percentage: 100,
  });
}

/** Generate a weekly health notification (once per ISO week). */
export async function generateWeeklyHealthNotification(userId: string, score: number, insight: string): Promise<void> {
  const now = new Date();
  const weekKey = `health-weekly-${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;
  if (localStorage.getItem(weekKey)) return;

  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';

  await insertNotification(userId, {
    type: 'health_weekly',
    title: `Weekly Health: ${score}/100 — ${label}`,
    description: insight,
  });

  localStorage.setItem(weekKey, 'true');
}

/** Generate a weekly tip notification (once per ISO week). */
export async function generateWeeklyTip(userId: string): Promise<void> {
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const weekKey = `tip-weekly-${getISOWeekYear(now)}-W${String(weekNumber).padStart(2, '0')}`;
  if (localStorage.getItem(weekKey)) return;

  const tip = WEEKLY_TIPS[weekNumber % WEEKLY_TIPS.length];

  await insertNotification(userId, {
    type: 'weekly_tip',
    title: 'Weekly Tip',
    description: tip,
  });

  localStorage.setItem(weekKey, 'true');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEEKLY_TIPS: string[] = [
  "Track every expense for 7 days — awareness alone can reduce spending by 10-15%.",
  "Review your subscriptions this week. Cancel any you haven't used in 30 days.",
  "Set up automatic savings — even a small amount builds the habit.",
  "Use the 24-hour rule: wait a day before any non-essential purchase over $50.",
  "Pack lunch twice this week — small swaps add up to big savings over a year.",
  "Check your bank statements for fees you didn't notice. Many are negotiable.",
  "Set a weekly 'no-spend' day to reset your spending habits.",
  "Round up every purchase mentally — it builds awareness of true costs.",
  "Review your insurance policies annually. You might find better rates.",
  "Automate bill payments to avoid late fees and protect your credit score.",
  "Try a cash-only week for discretionary spending — physical money feels more real.",
  "Negotiate one recurring bill this week (internet, phone, insurance).",
  "Set a specific savings goal with a deadline — vague goals rarely get met.",
  "Unsubscribe from marketing emails that tempt impulse purchases.",
  "Cook at home one extra night this week — dining out costs 3-5x more.",
  "Build an emergency fund covering 3 months of expenses before investing.",
  "Compare prices on your 3 most frequent purchases — loyalty isn't always rewarded.",
  "Review your budget categories — are they still relevant to your lifestyle?",
  "Pause before buying: ask 'Do I need this, or do I want this?'",
  "Celebrate small wins — hitting a savings milestone keeps motivation high.",
];

/** Map a Supabase row to the AppNotification shape. */
function mapRow(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    type: row.type as AppNotification['type'],
    title: row.title as string,
    description: (row.description as string) || '',
    amount: row.amount != null ? Number(row.amount) : undefined,
    percentage: row.percentage != null ? Number(row.percentage) : undefined,
    deep_link: (row.deep_link as string) || undefined,
    image: (row.image as string) || undefined,
    metadata: row.metadata as Record<string, string> | undefined,
    created_at: row.created_at as string,
    read: row.read as boolean,
  };
}
