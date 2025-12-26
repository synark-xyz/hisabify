import { useMemo } from 'react';
import { useCurrency } from './useCurrency';
import { useExchangeRateQuery } from './useExchangeRate';

interface ConversionResult {
  convertedAmount: number;
  isConverting: boolean;
}

/**
 * Hook to convert an amount from a stored base currency to the user's current currency
 * Uses React Query for caching to prevent flickering
 */
export function useConvertedAmount(
  amount: number,
  storedCurrency: string | null | undefined
): ConversionResult {
  const { currency } = useCurrency();
  const fromCurrency = storedCurrency || 'USD';
  
  const { data: rateData, isLoading } = useExchangeRateQuery(fromCurrency, currency);

  const convertedAmount = useMemo(() => {
    if (currency === fromCurrency) {
      return amount;
    }
    if (rateData?.rate) {
      return amount * rateData.rate;
    }
    return amount;
  }, [amount, currency, fromCurrency, rateData?.rate]);

  return { 
    convertedAmount, 
    isConverting: isLoading && currency !== fromCurrency 
  };
}

/**
 * Hook to convert multiple amounts from stored currencies to the user's current currency
 * Returns total of all converted amounts
 */
export function useConvertedTotal(
  items: Array<{ amount: number; currency_base?: string | null }>
): ConversionResult {
  const { currency } = useCurrency();
  
  // Group items by their currency for efficient rate fetching
  const currencyGroups = useMemo(() => {
    const groups = new Map<string, number>();
    for (const item of items) {
      const curr = item.currency_base || 'USD';
      groups.set(curr, (groups.get(curr) || 0) + item.amount);
    }
    return groups;
  }, [items]);

  // Get unique currencies that need conversion
  const uniqueCurrencies = useMemo(() => 
    Array.from(currencyGroups.keys()).filter(c => c !== currency),
    [currencyGroups, currency]
  );

  // Fetch rates for all needed currencies (React Query handles caching)
  const rateQueries = uniqueCurrencies.map(curr => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useExchangeRateQuery(curr, currency)
  );

  const isConverting = rateQueries.some(q => q.isLoading);

  const convertedTotal = useMemo(() => {
    let total = 0;
    
    for (const [curr, amount] of currencyGroups.entries()) {
      if (curr === currency) {
        total += amount;
      } else {
        const queryIndex = uniqueCurrencies.indexOf(curr);
        const rate = rateQueries[queryIndex]?.data?.rate;
        if (rate) {
          total += amount * rate;
        } else {
          total += amount; // Fallback to original
        }
      }
    }
    
    return total;
  }, [currencyGroups, currency, uniqueCurrencies, rateQueries]);

  return { convertedAmount: convertedTotal, isConverting };
}
