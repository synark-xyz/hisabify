# Subscription Data Model Plan

You are absolutely right. To build a robust subscription system (like "Hisabify Pro"), simply having an `is_premium` flag in the `profiles` table is not enough. You need a dedicated way to track the *lifecycle* of a subscription (trials, cancellations, renewals, etc.) and link your users to your payment provider (Stripe).

Here is the comprehensive plan for the data layer.

## 1. Profiles Table (Enhancement)
**Existing:** Stores user display info (`display_name`) and settings.
**Missing:** A link to the Stripe Customer.

**Action:** Add `stripe_customer_id`.

```sql
alter table profiles add column if not exists stripe_customer_id text;
```

## 2. Subscriptions Table (New)
**Missing:** This is the core piece you identified. We need a table to store the state of the user's subscription as reported by Stripe.

**Why we need it:**
- **Status Tracking**: Is it `active`, `past_due` (payment failed), or `canceled`?
- **Gracing Period**: If a user cancels, they usually keep access until `current_period_end`. The `is_premium` flag alone handles this poorly without a scheduled job.
- **Plan Management**: Which `price_id` are they on? (Monthly vs Yearly).

**Schema:**
- `id`: The Stripe Subscription ID (Primary Key).
- `user_id`: Link to Supabase User.
- `status`: Enum (`active`, `trialing`, `past_due`, `canceled`, etc.).
- `price_id`: The specific Price ID from Stripe (e.g., `price_123...`).
- `current_period_end`: When the subscription renews or expires.
- `cancel_at_period_end`: Boolean (true if user clicked "Cancel").

## 3. Products & Prices Tables (Optional but Recommended)
**Missing:** While you can hardcode prices (`$4.99`) in the frontend, it is best practice to sync your Products and Prices from Stripe to the database. This allows you to change pricing in the Stripe Dashboard without deploying new code.

---

## 4. Implementation Steps

### Step 1: Run Database Migration
I have created a migration file `supabase/migrations/20260123_create_subscriptions_table.sql` that:
1. Adds `stripe_customer_id` to `profiles`.
2. Creates the `subscriptions` table.
3. Sets up Row Level Security (RLS) so users can only read their own subscription.

### Step 2: Update Supabase Types
After running the migration, we will update `src/integrations/supabase/types.ts` to include these new definitions so we can use them in our code.

### Step 3: Webhook Handler (Future)
You will need a Supabase Edge Function or an API route to listen for Stripe Webhooks (`customer.subscription.created`, `updated`, `deleted`) to keep this `subscriptions` table in sync.

### Step 4: Logic Update
- **Current Logic**: `useSubscription` checks `profile.is_premium`.
- **New Logic**: `useSubscription` should check if `subscriptions.status === 'active'` OR `profile.is_premium` (for legacy/manual overrides).

## Summary
You were missing the **Subscriptions Table** and the **Stripe Customer Link**. I have prepared the SQL migration to fix this.
