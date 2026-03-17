import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';

interface SubscriptionPricing {
  currency_code: string;
  monthly_price: number;
  yearly_price: number;
  note: string | null;
}

async function fetchPricing(currencyCode: string): Promise<SubscriptionPricing> {
  // Try to find an exact match for the user's currency first,
  // then fall back to the DEFAULT row.
  const { data, error } = await supabase
    .from('subscription_pricing')
    .select('currency_code, monthly_price, yearly_price, note')
    .in('currency_code', [currencyCode, 'DEFAULT'])
    .eq('is_active', true);

  if (error) throw new Error(error.message);

  // Prefer the exact currency match over DEFAULT
  const exact = data?.find((r) => r.currency_code === currencyCode);
  const fallback = data?.find((r) => r.currency_code === 'DEFAULT');
  const row = exact ?? fallback;

  if (!row) {
    // Hard fallback — should never happen if the DEFAULT row exists
    return { currency_code: 'USD', monthly_price: 4.99, yearly_price: 39.99, note: null };
  }

  return row as SubscriptionPricing;
}

export function useSubscriptionPricing() {
  const { currency, formatAmount } = useCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-pricing', currency],
    queryFn: () => fetchPricing(currency),
    staleTime: 60 * 60 * 1000, // 1 hour — pricing rarely changes
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const pricing = data ?? { currency_code: 'USD', monthly_price: 4.99, yearly_price: 39.99, note: null };

  // Format using the resolved currency code (may differ from user's display currency
  // if no exact match was found and the DEFAULT/USD row is used instead)
  const resolvedCurrency = pricing.currency_code === 'DEFAULT' ? 'USD' : pricing.currency_code;

  const formatPrice = (amount: number) => {
    if (resolvedCurrency === currency) {
      // Use the shared formatAmount so formatting is consistent across the app
      return formatAmount(amount);
    }
    // Pricing row currency differs from user's display currency (shouldn't normally happen)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: ['JPY', 'KRW', 'IDR', 'VND'].includes(resolvedCurrency) ? 0 : 2,
      maximumFractionDigits: ['JPY', 'KRW', 'IDR', 'VND'].includes(resolvedCurrency) ? 0 : 2,
    }).format(amount);
  };

  return {
    monthlyPrice: formatPrice(pricing.monthly_price),
    yearlyPrice: formatPrice(pricing.yearly_price),
    rawMonthly: pricing.monthly_price,
    rawYearly: pricing.yearly_price,
    pricingCurrency: resolvedCurrency,
    loading: isLoading,
  };
}
