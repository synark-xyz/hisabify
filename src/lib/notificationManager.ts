import { toast } from 'sonner';
import { getISOWeek, getISOWeekYear } from 'date-fns';

export interface AppNotification {
  id: string;
  type: 'budget_warning' | 'budget_exceeded' | 'goal_milestone' | 'goal_completed' | 'push_notification' | 'health_weekly' | 'weekly_tip';
  title: string;
  description: string;
  amount?: number;
  percentage?: number;
  deepLink?: string; // optional in-app route, e.g. "/budget" or "/notifications"
  metadata?: Record<string, string>; // FCM data payload fields (reminder_id, type, etc.)
  timestamp: string;
  read: boolean;
}

const NOTIFICATIONS_KEY = 'app-notifications';
const MAX_NOTIFICATIONS = 50; // Keep last 50 notifications

// Get all notifications from localStorage
export function getNotifications(): AppNotification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading notifications:', e);
  }
  return [];
}

// Save notifications to localStorage
function saveNotifications(notifications: AppNotification[]) {
  try {
    // Keep only the most recent MAX_NOTIFICATIONS
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error saving notifications:', e);
  }
}

// Add a new notification
function addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
  const newNotification: AppNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const notifications = getNotifications();
  notifications.unshift(newNotification); // Add to beginning
  saveNotifications(notifications);

  return newNotification;
}

// Normalize a deeplink from FCM data to a React Router path.
// Accepts absolute paths ("/budget"), bare names ("budget"),
// or custom-scheme URLs ("hisabify://budget").
function resolveDeepLink(raw: string): string {
  if (!raw) return '';
  // Strip custom scheme: "hisabify://budget" → "budget"
  const stripped = raw.replace(/^[a-z][a-z0-9+\-.]*:\/\//i, '');
  // Ensure leading slash
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

// Add a push notification (from FCM), with deduplication.
// Both pushNotificationReceived (foreground) and pushNotificationActionPerformed (tap)
// call this for the same message — the 60-second dedup window prevents doubles.
export function addPushNotification(
  title: string,
  body: string,
  rawDeepLink?: string,
  metadata?: Record<string, string>,
): void {
  // Deduplicate: skip if an identical push was stored in the last 60 seconds
  const existing = getNotifications();
  const sixtySecondsAgo = Date.now() - 60_000;
  const isDuplicate = existing.some(
    n =>
      n.type === 'push_notification' &&
      n.title === title &&
      n.description === body &&
      new Date(n.timestamp).getTime() > sixtySecondsAgo,
  );
  if (isDuplicate) return;

  const deepLink = rawDeepLink ? resolveDeepLink(rawDeepLink) : undefined;
  // Filter out title/body/message from metadata since they're already stored as top-level fields
  const filteredMeta = metadata
    ? Object.fromEntries(Object.entries(metadata).filter(([k]) => !['title', 'body', 'message'].includes(k)))
    : undefined;
  const hasMeta = filteredMeta && Object.keys(filteredMeta).length > 0;
  addNotification({ type: 'push_notification', title, description: body, deepLink, metadata: hasMeta ? filteredMeta : undefined });
  // Notify any active listeners (e.g. NotificationsPage) to re-read localStorage
  window.dispatchEvent(new CustomEvent('hisabify:push-notification'));
}

// Delete a notification by id
export function deleteNotification(id: string): void {
  const all = getNotifications();
  const updated = all.filter(n => n.id !== id);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
}

// Mark notification as read
export function markNotificationAsRead(id: string) {
  const notifications = getNotifications();
  const updated = notifications.map(n =>
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(updated);
}

// Mark all as read
export function markAllNotificationsAsRead() {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  saveNotifications(updated);
}

// Clear old notifications (older than 30 days)
export function clearOldNotifications() {
  const notifications = getNotifications();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filtered = notifications.filter(n =>
    new Date(n.timestamp).getTime() > thirtyDaysAgo
  );
  saveNotifications(filtered);
}

// Show budget warning (once per day per budget)
export function showBudgetWarning(budgetName: string, percentage: number, periodType: string) {
  const alertKey = `budget-warning-${budgetName}-${new Date().toDateString()}`;
  const shown = sessionStorage.getItem(alertKey);

  if (!shown) {
    sessionStorage.setItem(alertKey, 'true');

    // Show toast
    toast.warning(`Budget Warning: ${budgetName}`, {
      description: `You've used ${percentage.toFixed(0)}% of your ${periodType} budget.`
    });

    // Add to notifications
    addNotification({
      type: 'budget_warning',
      title: `Budget Warning: ${budgetName}`,
      description: `You've used ${percentage.toFixed(0)}% of your ${periodType} budget.`,
      percentage,
    });
  }
}

// Show budget exceeded (once per day per budget)
export function showBudgetExceeded(budgetName: string, percentage: number, periodType: string) {
  const alertKey = `budget-exceeded-${budgetName}-${new Date().toDateString()}`;
  const shown = sessionStorage.getItem(alertKey);

  if (!shown) {
    sessionStorage.setItem(alertKey, 'true');

    // Show toast
    toast.error(`Budget Exceeded: ${budgetName}`, {
      description: `You've spent ${percentage.toFixed(0)}% of your ${periodType} budget.`
    });

    // Add to notifications
    addNotification({
      type: 'budget_exceeded',
      title: `Budget Exceeded: ${budgetName}`,
      description: `You've spent ${percentage.toFixed(0)}% of your ${periodType} budget.`,
      percentage,
    });
  }
}

// Show goal milestone
export function showGoalMilestone(goalName: string, percentage: number, amount: number) {
  const milestones = [25, 50, 75, 90];
  const milestone = milestones.find(m => percentage >= m && percentage < m + 5);

  if (milestone) {
    const alertKey = `goal-milestone-${goalName}-${milestone}`;
    const shown = sessionStorage.getItem(alertKey);

    if (!shown) {
      sessionStorage.setItem(alertKey, 'true');

      // Show toast
      toast.success(`Savings Milestone: ${goalName}`, {
        description: `You're ${percentage.toFixed(0)}% of the way to your goal!`
      });

      // Add to notifications
      addNotification({
        type: 'goal_milestone',
        title: `Savings Milestone: ${goalName}`,
        description: `You're ${percentage.toFixed(0)}% of the way to your goal!`,
        amount,
        percentage,
      });
    }
  }
}

// Clear all notifications
export function clearAllNotifications(): void {
  localStorage.removeItem(NOTIFICATIONS_KEY);
}

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

// Generate a weekly health notification (once per ISO week)
export function generateWeeklyHealthNotification(score: number, insight: string): void {
  const now = new Date();
  const weekKey = `health-weekly-${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;

  if (localStorage.getItem(weekKey)) return;

  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';

  addNotification({
    type: 'health_weekly',
    title: `Weekly Health: ${score}/100 — ${label}`,
    description: insight,
  });

  localStorage.setItem(weekKey, 'true');
}

// Generate a weekly tip notification (once per ISO week)
export function generateWeeklyTip(): void {
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const weekKey = `tip-weekly-${getISOWeekYear(now)}-W${String(weekNumber).padStart(2, '0')}`;

  if (localStorage.getItem(weekKey)) return;

  const tip = WEEKLY_TIPS[weekNumber % WEEKLY_TIPS.length];

  addNotification({
    type: 'weekly_tip',
    title: 'Weekly Tip',
    description: tip,
  });

  localStorage.setItem(weekKey, 'true');
}

// Show goal completed
export function showGoalCompleted(goalName: string, amount: number) {
  const alertKey = `goal-completed-${goalName}`;
  const shown = sessionStorage.getItem(alertKey);

  if (!shown) {
    sessionStorage.setItem(alertKey, 'true');

    // Show toast
    toast.success(`Goal Achieved: ${goalName}`, {
      description: `Congratulations! You've reached your savings goal!`
    });

    // Add to notifications
    addNotification({
      type: 'goal_completed',
      title: `Goal Achieved: ${goalName}`,
      description: `Congratulations! You've reached your savings goal!`,
      amount,
      percentage: 100,
    });
  }
}
