import { useMemo, useState, useEffect } from 'react';
import { useCurrency } from './useCurrency';
import { useExchangeRateQuery, useExchangeRate } from './useExchangeRate';

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
 * Uses async fetching instead of dynamic hook calls to comply with React rules
 */
export function useConvertedTotal(
  items: Array<{ amount: number; currency_base?: string | null }>
): ConversionResult {
  const { currency } = useCurrency();
  const { getExchangeRate, getCachedRate } = useExchangeRate();
  const [rates, setRates] = useState<Map<string, number>>(new Map());
  const [isConverting, setIsConverting] = useState(false);
  
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

  // Fetch rates asynchronously
  useEffect(() => {
    if (uniqueCurrencies.length === 0) {
      setIsConverting(false);
      return;
    }

    // First try to use cached rates
    const cachedRates = new Map<string, number>();
    let allCached = true;
    
    for (const curr of uniqueCurrencies) {
      const cached = getCachedRate(curr, currency);
      if (cached !== null) {
        cachedRates.set(curr, cached);
      } else {
        allCached = false;
      }
    }

    if (allCached) {
      setRates(cachedRates);
      setIsConverting(false);
      return;
    }

    // Fetch missing rates
    setIsConverting(true);
    
    const fetchRates = async () => {
      const newRates = new Map<string, number>(cachedRates);
      
      await Promise.all(
        uniqueCurrencies
          .filter(curr => !cachedRates.has(curr))
          .map(async (curr) => {
            const result = await getExchangeRate(curr, currency);
            if (result?.rate) {
              newRates.set(curr, result.rate);
            }
          })
      );
      
      setRates(newRates);
      setIsConverting(false);
    };

    fetchRates();
  }, [uniqueCurrencies, currency, getExchangeRate, getCachedRate]);

  const convertedTotal = useMemo(() => {
    let total = 0;
    
    for (const [curr, amount] of currencyGroups.entries()) {
      if (curr === currency) {
        total += amount;
      } else {
        const rate = rates.get(curr);
        if (rate) {
          total += amount * rate;
        } else {
          total += amount; // Fallback to original
        }
      }
    }
    
    return total;
  }, [currencyGroups, currency, rates]);

  return { convertedAmount: convertedTotal, isConverting };
}
