---
created: 2026-03-28T00:00:00.000Z
title: Automated daily gamification tasks for users
area: general
files:
  - src/features/gamification/
  - src/hooks/useNotifications.ts
  - supabase/migrations/
  - supabase/functions/
---

## Problem

Gamification currently only surfaces a health score — a passive metric with no active engagement loop. There is no daily reason to open the app. Daily tasks create habit-forming behaviour, feed into the coin economy, and directly drive DAU and retention through a progress-completion reward cycle.

## Solution

- **Daily task engine:** 3 personalised tasks generated per user per day. Tasks are rule-based initially (can be AI-assisted later):
  - *Logging task:* "Log 3 expenses today" / "Log your income this week"
  - *Review task:* "Check your dining budget status" / "Review last week's spending"
  - *Goal task:* "Add ৳500 to your [savings goal]" / "Create a budget for your top spending category"
  - *Social task:* "Invite a friend" / "Share your health score"
- **DB schema:** `daily_tasks` table — `id`, `user_id`, `task_date` (date), `tasks` (JSONB array of `{id, type, description, coin_reward, completed}`), `total_coins_available`, `coins_earned`, `streak_day`, `created_at`
- **Completion rewards:** Each task awards 20–50 coins. Completing all 3 gives a 50% bonus. Streak multiplier: day 1–6 = 1x, day 7+ = 1.5x, day 14+ = 2x
- **Streak tracking:** `user_streaks` table — `user_id`, `current_streak`, `longest_streak`, `last_completed_date`
- **Reset:** pg_cron job at midnight UTC regenerates tasks for all users (or lazy-generate on first open of day)
- **UI:** Daily tasks card on Dashboard — shows task list with checkboxes, coin reward per task, streak counter, and today's total coins available
- **Notifications:** Push notification at user's configured time (default 09:00 local) for incomplete daily tasks. Uses existing `schedule-payment-reminders` function pattern and FCM send-push-notification function
- **Coin integration:** Task completion calls `earn_coins()` RPC (see coin-system todo)
