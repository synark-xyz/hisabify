import { useState, useEffect } from 'react';
import { useCurrency } from './useCurrency';
import { useExchangeRate } from './useExchangeRate';

interface ConversionResult {
  convertedAmount: number;
  isConverting: boolean;
}

/**
 * Hook to convert an amount from a stored base currency to the user's current currency
 * @param amount - The amount to convert
 * @param storedCurrency - The currency the amount was stored in
 * @returns The converted amount and loading state
 */
export function useConvertedAmount(
  amount: number,
  storedCurrency: string | null | undefined
): ConversionResult {
  const { currency, currencyVersion } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const [convertedAmount, setConvertedAmount] = useState(amount);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const convert = async () => {
      const fromCurrency = storedCurrency || 'USD';
      
      // If same currency, no conversion needed
      if (currency === fromCurrency) {
        setConvertedAmount(amount);
        return;
      }

      setIsConverting(true);
      try {
        const result = await convertAmount(amount, fromCurrency, currency);
        if (result) {
          setConvertedAmount(result.convertedAmount);
        } else {
          setConvertedAmount(amount);
        }
      } catch {
        setConvertedAmount(amount);
      } finally {
        setIsConverting(false);
      }
    };

    convert();
  }, [amount, storedCurrency, currency, currencyVersion, convertAmount]);

  return { convertedAmount, isConverting };
}

/**
 * Hook to convert multiple amounts from a stored base currency to the user's current currency
 * Returns total of all converted amounts
 */
export function useConvertedTotal(
  items: Array<{ amount: number; currency_base?: string | null }>
): ConversionResult {
  const { currency, currencyVersion } = useCurrency();
  const { convertAmount } = useExchangeRate();
  const [convertedTotal, setConvertedTotal] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const convertAll = async () => {
      if (items.length === 0) {
        setConvertedTotal(0);
        return;
      }

      setIsConverting(true);
      try {
        let total = 0;
        
        for (const item of items) {
          const fromCurrency = item.currency_base || 'USD';
          
          if (currency === fromCurrency) {
            total += item.amount;
          } else {
            const result = await convertAmount(item.amount, fromCurrency, currency);
            if (result) {
              total += result.convertedAmount;
            } else {
              total += item.amount;
            }
          }
        }
        
        setConvertedTotal(total);
      } catch {
        // Fallback to sum of original amounts
        setConvertedTotal(items.reduce((sum, i) => sum + i.amount, 0));
      } finally {
        setIsConverting(false);
      }
    };

    convertAll();
  }, [items, currency, currencyVersion, convertAmount]);

  return { convertedAmount: convertedTotal, isConverting };
}
