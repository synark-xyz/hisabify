import { toast } from 'sonner';

export interface AppNotification {
  id: string;
  type: 'budget_warning' | 'budget_exceeded' | 'goal_milestone' | 'goal_completed';
  title: string;
  description: string;
  amount?: number;
  percentage?: number;
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
