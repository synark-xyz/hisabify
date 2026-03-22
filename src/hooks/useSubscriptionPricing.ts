import { useQuery } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import type { PurchasesOfferings } from '@revenuecat/purchases-capacitor';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';

interface SubscriptionPricing {
  currency_code: string;
  monthly_price: number;
  yearly_price: number;
  monthly_price_string: string | null;
  yearly_price_string: string | null;
  note: string | null;
}

async function fetchSupabasePricing(currencyCode: string): Promise<SubscriptionPricing> {
  const { data, error } = await supabase
    .from('subscription_pricing')
    .select('currency_code, monthly_price, yearly_price, note')
    .in('currency_code', [currencyCode, 'DEFAULT'])
    .eq('is_active', true);

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    return { currency_code: 'USD', monthly_price: 4.99, yearly_price: 39.99, monthly_price_string: null, yearly_price_string: null, note: null };
  }

  const exact = data.find((r) => r.currency_code === currencyCode);
  const fallback = data.find((r) => r.currency_code === 'DEFAULT');
  const row = exact ?? fallback;

  if (!row) {
    return { currency_code: 'USD', monthly_price: 4.99, yearly_price: 39.99, monthly_price_string: null, yearly_price_string: null, note: null };
  }

  return { ...row, monthly_price_string: null, yearly_price_string: null } as SubscriptionPricing;
}

async function fetchRevenueCatPricing(
  getOfferings: () => Promise<PurchasesOfferings | null>
): Promise<SubscriptionPricing | null> {
  try {
    const offerings = await getOfferings();
    // Prefer current offering; fall back to first available (covers non-default identifier)
    const activeOffering =
      offerings?.current ??
      (offerings?.all ? Object.values(offerings.all)[0] : null);
    if (!activeOffering) return null;
    const pkgs = activeOffering.availablePackages;
    const monthly = pkgs.find(p => p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly');
    const yearly  = pkgs.find(p => p.packageType === 'ANNUAL'  || p.identifier === '$rc_annual');
    if (!monthly && !yearly) return null;
    return {
      currency_code: monthly?.product.currencyCode ?? yearly?.product.currencyCode ?? 'USD',
      monthly_price: monthly?.product.price ?? 4.99,
      yearly_price:  yearly?.product.price  ?? 39.99,
      monthly_price_string: monthly?.product.priceString ?? null,
      yearly_price_string:  yearly?.product.priceString  ?? null,
      note: null,
    };
  } catch {
    return null;
  }
}

export function useSubscriptionPricing() {
  const { currency, formatAmount } = useCurrency();
  const { getOfferings, revenueCatReady } = useSubscription();
  const isNative = Capacitor.isNativePlatform();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-pricing', currency, isNative ? 'native' : 'web'],
    queryFn: async () => {
      // On native, try RevenueCat first to get actual store prices
      if (isNative && revenueCatReady) {
        const rcPricing = await fetchRevenueCatPricing(getOfferings);
        if (rcPricing) return rcPricing;
      }
      // Fall back to Supabase pricing
      return fetchSupabasePricing(currency);
    },
    enabled: !isNative || revenueCatReady,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const pricing = data ?? { currency_code: 'USD', monthly_price: 2.99, yearly_price: 29.99, monthly_price_string: null, yearly_price_string: null, note: null };

  const resolvedCurrency = pricing.currency_code === 'DEFAULT' ? 'USD' : pricing.currency_code;

  const formatPrice = (amount: number) => {
    if (resolvedCurrency === currency) {
      return formatAmount(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: ['JPY', 'KRW', 'IDR', 'VND'].includes(resolvedCurrency) ? 0 : 2,
      maximumFractionDigits: ['JPY', 'KRW', 'IDR', 'VND'].includes(resolvedCurrency) ? 0 : 2,
    }).format(amount);
  };

  return {
    // Prefer RC's localized price strings (e.g. "$4.99") on native
    monthlyPrice: pricing.monthly_price_string ?? formatPrice(pricing.monthly_price),
    yearlyPrice: pricing.yearly_price_string ?? formatPrice(pricing.yearly_price),
    rawMonthly: pricing.monthly_price,
    rawYearly: pricing.yearly_price,
    pricingCurrency: resolvedCurrency,
    loading: isLoading,
  };
}
