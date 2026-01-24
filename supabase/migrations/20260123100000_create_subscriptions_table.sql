-- Add Stripe Customer ID to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT NOT NULL PRIMARY KEY, -- Matches Stripe Subscription ID
    user_id UUID REFERENCES auth.users NOT NULL,
    status TEXT CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused')) NOT NULL,
    metadata JSONB,
    price_id TEXT,
    quantity INTEGER,
    cancel_at_period_end BOOLEAN,
    created TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    cancel_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    canceled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    trial_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    trial_end TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own subscriptions
CREATE POLICY "Can view own subscription data." ON public.subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role (Admin/Webhooks) can do anything
CREATE POLICY "Service role can manage all subscriptions." ON public.subscriptions 
    USING (true) 
    WITH CHECK (true);
