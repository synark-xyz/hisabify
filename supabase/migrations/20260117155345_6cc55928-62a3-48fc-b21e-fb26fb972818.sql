-- Create recurring_expenses table for expense templates
CREATE TABLE public.recurring_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    frequency TEXT NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly, yearly
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    next_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    last_created_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_recurring_expenses_user_id ON public.recurring_expenses(user_id);
CREATE INDEX idx_recurring_expenses_category_id ON public.recurring_expenses(category_id);
CREATE INDEX idx_recurring_expenses_next_due_date ON public.recurring_expenses(next_due_date);
CREATE INDEX idx_recurring_expenses_is_active ON public.recurring_expenses(is_active);

-- Enable Row Level Security
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own recurring expenses
CREATE POLICY "Users can view their own recurring expenses"
ON public.recurring_expenses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring expenses"
ON public.recurring_expenses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring expenses"
ON public.recurring_expenses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring expenses"
ON public.recurring_expenses
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic updated_at timestamp
CREATE TRIGGER update_recurring_expenses_updated_at
BEFORE UPDATE ON public.recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();