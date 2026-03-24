---
created: 2026-03-22T00:00:00.000Z
title: Add health score detail page with calculations and tips
area: ui
files:
  - src/features/gamification/healthScoreLogic.ts
  - src/features/gamification/
  - src/pages/
  - src/components/dashboard/
---

## Problem

The health score (financial health score) is displayed on the dashboard as a single number, but users have no way to understand how it was calculated or how to improve it. The score is computed from 3 factors (40% budget adherence, 30% savings progress, 30% activity) but this breakdown is invisible to users.

Users need:
- A dedicated detail page or bottom sheet showing the score breakdown
- Visual representation of each component score (budget, savings, activity)
- Personalized tips based on which component is dragging the score down
- Historical trend of the score over time (optional)

## Solution

1. Create `HealthScoreDetailPage.tsx` or a bottom sheet component
2. Expose sub-scores from `healthScoreLogic.ts` (budget score, savings score, activity score)
3. Show each component as a progress bar with label and weight (e.g., "Budget: 40% weight, your score: 72")
4. Generate contextual tips based on weakest component:
   - Low budget score → "You exceeded 2 budgets this month. Try reducing dining spend."
   - Low savings score → "You're 30% toward your goal. Set up auto-contributions."
   - Low activity score → "Log at least 3 transactions per week to maintain your streak."
5. Add route `/health-score` or open as a modal/sheet from dashboard score widget
6. Tap on the score widget on dashboard to navigate to the detail view
