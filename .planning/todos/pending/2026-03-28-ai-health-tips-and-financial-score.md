---
created: 2026-03-28T00:00:00.000Z
title: AI-generated health tips and financial health calculations
area: general
files:
  - src/features/gamification/utils/healthScoreLogic.ts
  - src/features/gamification/components/HealthScoreCard.tsx
  - src/features/gamification/components/HealthScoreDetailSheet.tsx
  - supabase/functions/parse-transaction/index.ts
  - supabase/migrations/
---

## Problem

The current health score is a static formula (40% budget adherence + 30% savings + 30% activity) with no personalisation and no actionable feedback. Tips shown are hard-coded and generic. Users don't understand why their score changed or what specific action would improve it.

## Solution

- **AI health calculation via Edge Function:** New `generate-health-insights` Supabase function. Receives anonymised financial summary (spend by category, budget adherence %, savings velocity, transaction frequency, recurring bills vs discretionary ratio). Calls Claude (claude-sonnet-4-6) to return:
  - Weighted sub-scores for each dimension with brief natural-language explanation
  - 3–5 personalised, actionable tips (e.g., "You spent 42% more on dining vs last month — try a ৳3,000 dining budget")
  - Week-over-week and month-over-month score delta with short commentary
- **Caching:** Store generated insights in new `health_insights` DB table: `user_id`, `score`, `sub_scores` (JSONB), `tips` (JSONB), `generated_at`. 24-hour TTL — reuse cached insights within TTL to avoid unnecessary API calls
- **Fallback:** Keep existing static `healthScoreLogic.ts` formula as fallback if AI call fails or is rate-limited; display static score with "personalized insights loading…" message
- **HealthScoreDetailSheet:** Replace hard-coded tips with AI-generated tips from cache; show "Updated X hours ago" timestamp; pull-to-refresh to force regeneration
- **HealthScoreCard:** Show score from cache (instant load); badge if score improved since last insight generation
- **Privacy:** Financial summary sent to AI is aggregated (totals/percentages only), never raw transaction descriptions or merchant names
