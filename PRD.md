# PRD: Subscription Model - "Hisabify Pro"

## 1. Overview
The goal of this initiative is to transition Hisabify from a free utility to a sustainable freemium product. By introducing a subscription model, we can cover operational costs and generate monthly recurring revenue (MRR).

## 2. Target Audience
- **Power Users**: Users tracking complex budgets and high transaction volumes.
- **Multilingual/Global Users**: Users needing multi-currency and live exchange rates.
- **Organization-focused Users**: Users who need to export data for tax or planning.

## 3. Subscription Tiers (Mapping Existing Features)

### 🆓 Free Tier (The "Starter" Plan)
*Core expense tracking for individuals.*
- **Unlimited Transactions**: Basic logging remains free.
- **Budgeting**: Up to **1 active budget category** (The "Planner").
- **Savings Goals**: Up to **1 active savings goal**.
- **Analytics**: Basic monthly summary only.
- **Currency**: Single primary currency only.
- **History**: Last **30 days** of transaction history.

### 💎 Pro Tier (The "Pro" Plan - $4.99/mo)
*Advanced tools for serious financial management.*
- **Unlimited Budgets**: Remove the cap on budget categories.
- **Unlimited Savings Goals**: Create as many savings goals as you focus on.
- **Infinite History**: Access to all-time data and the **Budget vs Spending History Chart** (Existing: `BudgetHistoryChart`).
- **Automation**: Use of the **"Copy to Next Month"** feature (Existing: `copyBudgetToNextPeriod`).
- **Multi-Currency**: Access to the **Currency Selector** and live conversions (Existing: `useCurrency`).
- **Data Export**: Generate PDF/CSV reports (Planned).
- **Advanced Insights**: Period-over-period comparisons in the **Financial Summary** (Existing: `FinancialSummary`).

## 4. Technical Requirements
- **Entitlement Logic**: A `useSubscription` hook to check `is_premium` status from Supabase.
- **UI Gating**: A `PremiumGuard` component to wrap premium features with a blur/lock UI.
- **Upsell Trigger**: Integration of an "Upgrade to Pro" modal.

## 5. AI Coding Agent Implementation Prompt
*Use this prompt to have an AI agent implement the subscription logic:*

> "Act as a Senior React Developer. Implement a subscription gating system for Hisabify. 
> 1. Create a `useSubscription` hook in `src/hooks/` that reads an `is_premium` boolean from the Supabase `profiles` table.
> 2. Create a `PremiumGuard` component that takes `children` and a `featureName`. If the user is not premium, it should show its children with a `blur-sm` filter and overlay a 'Pro' lock icon with an `onClick` that opens an Upgrade Modal.
> 3. Implement the Upgrade Modal showcasing the benefits: Unlimited Budgets, Savings Goals, History Charts, Multi-currency, and Account Exports.
> 4. Wrap the following existing components in the `PremiumGuard`: 
>    - `BudgetHistoryChart` in `BudgetDashboard.tsx`
>    - The 'Copy to Next' button in `BudgetProgressCard.tsx`
>    - The currency selection dropdown in `Settings.tsx`
> 5. Add a 1-budget limit check in the `AddBudgetModal` for free users.
> 6. Add a 1-goal limit check in the `AddSavingsGoalModal` for free users."

## 6. Roadmap Summary
- **Phase 1**: Logic & UI Gating (Current)
- **Phase 2**: Stripe Integration
- **Phase 3**: New Premium Features (OCR, Recurring)

