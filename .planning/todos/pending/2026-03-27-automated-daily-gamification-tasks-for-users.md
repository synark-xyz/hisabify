---
created: 2026-03-27T00:00:00.000Z
title: Automated daily gamification tasks for users
area: general
files:
  - src/features/gamification/
  - src/hooks/useNotifications.ts
  - supabase/migrations/
---

## Problem

Gamification currently only shows a health score with no active engagement loop. Users have no daily reason to open the app. Daily tasks create a habit-forming routine and feed directly into the coin economy, driving DAU and retention.

## Solution

- **Daily task engine:** AI (or rule-based) generates 3 personalized daily tasks per user based on their profile and recent behavior
  - Examples: "Log 2 expenses today", "Check your dining budget", "Add $10 to savings goal", "Review last week's spending"
- **Task types:** Logging tasks, review tasks, goal tasks, streak tasks, social tasks (invite friend, share milestone)
- **Completion rewards:** Each task awards coins; completing all 3 gives a bonus multiplier
- **Streak system:** Consecutive days completing all tasks increases coin multiplier (1x → 1.5x → 2x)
- **DB schema:** `daily_tasks` table with user_id, date, tasks JSON, completion status, coins_awarded
- **Notifications:** Push notification at user's preferred time reminding them of incomplete daily tasks
- **UI:** Daily tasks card on dashboard with progress indicator and coin reward display
- **Reset:** Tasks regenerate at midnight in user's timezone via Supabase cron/pg_cron
