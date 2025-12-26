import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRateResult {
  rate: number;
  source: string;
  timestamp: string;
}

export function useExchangeRate() {
  const [loading, setLoading] = useState(false);

  const getExchangeRate = async (
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

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-exchange-rate', {
        body: {
          from_currency: fromCurrency,
          to_currency: toCurrency
        }
      });

      if (error) {
        console.error('Error fetching exchange rate:', error);
        return null;
      }

      return data as ExchangeRateResult;
    } catch (err) {
      console.error('Failed to get exchange rate:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const convertAmount = async (
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
  };

  return {
    getExchangeRate,
    convertAmount,
    loading
  };
}
