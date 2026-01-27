import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ExchangeRateResult {
  rate: number;
  source: string;
  timestamp: string;
}

// Cache key for exchange rates
const EXCHANGE_RATE_KEY = 'exchange-rate';

// Cache duration: 6 hours in milliseconds
const CACHE_STALE_TIME = 6 * 60 * 60 * 1000;

// In-memory cache to prevent duplicate requests
const rateCache = new Map<string, { rate: number; timestamp: number }>();
const pendingRequests = new Map<string, Promise<ExchangeRateResult | null>>();

export function useExchangeRate() {
  const queryClient = useQueryClient();

  const getExchangeRate = useCallback(async (
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateResult | null> => {
    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return {
        rate: 1,
        source: 'same_currency',
        timestamp: new Date().toISOString()
      };
    }

    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const now = Date.now();

    // Check in-memory cache first (valid for 6 hours)
    const cached = rateCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_STALE_TIME) {
      return {
        rate: cached.rate,
        source: 'memory_cache',
        timestamp: new Date(cached.timestamp).toISOString()
      };
    }

    // Check if there's already a pending request for this pair
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create the request promise
    const requestPromise = (async (): Promise<ExchangeRateResult | null> => {
      try {
        // Use exchangerate-api.com free tier (1500 requests/month, no API key needed)
        const response = await fetch(
          `https://open.er-api.com/v6/latest/${fromCurrency}`
        );

        if (!response.ok) {
          console.error('Exchange rate API error:', response.statusText);
          return null;
        }

        const data = await response.json();

        if (data.result === 'error') {
          console.error('Exchange rate API returned error:', data);
          return null;
        }

        const rate = data.rates[toCurrency];

        if (!rate) {
          console.error(`No exchange rate found for ${toCurrency}`);
          return null;
        }

        const result: ExchangeRateResult = {
          rate: rate,
          source: 'exchangerate-api',
          timestamp: new Date(data.time_last_update_unix * 1000).toISOString()
        };

        // Store in memory cache
        rateCache.set(cacheKey, {
          rate: result.rate,
          timestamp: now
        });

        return result;
      } catch (err) {
        console.error('Failed to get exchange rate:', err);
        return null;
      } finally {
        // Remove from pending after a short delay to allow batched requests
        setTimeout(() => {
          pendingRequests.delete(cacheKey);
        }, 100);
      }
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }, []);

  const convertAmount = useCallback(async (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ convertedAmount: number; rate: number; source: string; timestamp: string } | null> => {
    const result = await getExchangeRate(fromCurrency, toCurrency);
    
    if (!result) {
      return null;
    }

    return {
      convertedAmount: amount * result.rate,
      rate: result.rate,
      source: result.source,
      timestamp: result.timestamp
    };
  }, [getExchangeRate]);

  // Get cached rate synchronously (returns null if not cached)
  const getCachedRate = useCallback((fromCurrency: string, toCurrency: string): number | null => {
    if (fromCurrency === toCurrency) return 1;
    
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = rateCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_STALE_TIME) {
      return cached.rate;
    }
    
    return null;
  }, []);

  // Prefetch common rates
  const prefetchRates = useCallback(async (baseCurrency: string, targetCurrencies: string[]) => {
    const promises = targetCurrencies
      .filter(tc => tc !== baseCurrency)
      .map(tc => getExchangeRate(baseCurrency, tc));
    
    await Promise.all(promises);
  }, [getExchangeRate]);

  return {
    getExchangeRate,
    convertAmount,
    getCachedRate,
    prefetchRates,
    loading: false
  };
}

// Hook for getting a specific exchange rate with React Query caching
export function useExchangeRateQuery(fromCurrency: string, toCurrency: string) {
  const { getExchangeRate } = useExchangeRate();

  return useQuery({
    queryKey: [EXCHANGE_RATE_KEY, fromCurrency, toCurrency],
    queryFn: () => getExchangeRate(fromCurrency, toCurrency),
    staleTime: CACHE_STALE_TIME,
    gcTime: CACHE_STALE_TIME * 2,
    enabled: !!fromCurrency && !!toCurrency,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1
  });
}
