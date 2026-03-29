---
created: 2026-03-27T00:00:00.000Z
title: AI-generated health tips and financial health calculations
area: general
files:
  - src/features/gamification/utils/healthScoreLogic.ts
  - src/features/gamification/components/HealthScoreCard.tsx
  - src/features/gamification/components/HealthScoreDetailSheet.tsx
  - supabase/functions/parse-transaction/index.ts
---

## Problem

The current health score is a static formula (40% budget + 30% savings + 30% activity) with no personalized feedback. Users don't know *why* their score is what it is or what specific actions would improve it. Tips shown are generic and not driven by the user's actual financial patterns.

## Solution

- **AI health calculation:** Use Claude (via Supabase Edge Function) to analyze user's transaction patterns, budget adherence, savings velocity, and spending categories — produce a nuanced score with weighted sub-scores and natural language explanation
- **Personalized tips:** AI generates 3-5 actionable tips based on actual data (e.g., "You spent 40% more on dining this month vs last — consider setting a dining budget")
- **Trend analysis:** Week-over-week and month-over-month score changes with AI commentary
- **Edge Function:** New `generate-health-insights` function that receives anonymized financial summary and returns score breakdown + tips
- **Caching:** Store generated insights in DB with 24-hour TTL to avoid re-computing on every load
- **Fallback:** Keep existing static formula as fallback if AI call fails
