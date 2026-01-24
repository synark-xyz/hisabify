import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => Promise<void>;
  formatAmount: (amount: number) => string;
  currencySymbol: string;
  refreshCurrency: () => Promise<void>;
  currencyVersion: number; // Used to trigger re-renders when currency changes
}

const currencyData: Record<string, { symbol: string; name: string; locale: string }> = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  BDT: { symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  CNY: { symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  KRW: { symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  MXN: { symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'zh-HK' },
  CHF: { symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
  SEK: { symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  THB: { symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
  PHP: { symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY' },
  VND: { symbol: '₫', name: 'Vietnamese Dong', locale: 'vi-VN' },
  RUB: { symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU' },
  ZAR: { symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  SAR: { symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA' },
  TRY: { symbol: '₺', name: 'Turkish Lira', locale: 'tr-TR' },
  PLN: { symbol: 'zł', name: 'Polish Zloty', locale: 'pl-PL' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
  DKK: { symbol: 'kr', name: 'Danish Krone', locale: 'da-DK' },
};

// Map country codes to currency codes
const countryCurrencyMap: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', EU: 'EUR', JP: 'JPY', CN: 'CNY',
  IN: 'INR', AU: 'AUD', KR: 'KRW', BR: 'BRL', MX: 'MXN', SG: 'SGD',
  HK: 'HKD', CH: 'CHF', SE: 'SEK', NZ: 'NZD', TH: 'THB', PH: 'PHP',
  ID: 'IDR', MY: 'MYR', VN: 'VND', RU: 'RUB', ZA: 'ZAR', AE: 'AED',
  SA: 'SAR', TR: 'TRY', PL: 'PLN', NO: 'NOK', DK: 'DKK', BD: 'BDT',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('currency') || 'USD';
  });
  const [currencyVersion, setCurrencyVersion] = useState(0);
  const [hasDetectedLocation, setHasDetectedLocation] = useState(false);

  // Detect location and set default currency
  const detectLocationCurrency = useCallback(async () => {
    if (hasDetectedLocation) return;

    try {
      // Check if user already has a currency preference
      const storedCurrency = localStorage.getItem('currency');
      if (storedCurrency && storedCurrency !== 'USD') {
        setHasDetectedLocation(true);
        return;
      }

      // Try to get location from IP
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country_code;
        const detectedCurrency = countryCurrencyMap[countryCode];

        if (detectedCurrency && currencyData[detectedCurrency]) {
          setCurrencyState(detectedCurrency);
          localStorage.setItem('currency', detectedCurrency);
          setCurrencyVersion(v => v + 1);
        }
      }
    } catch (error) {
      console.log('Could not detect location for currency');
    }
    setHasDetectedLocation(true);
  }, [hasDetectedLocation]);

  useEffect(() => {
    if (!user) {
      detectLocationCurrency();
    }
  }, [user, detectLocationCurrency]);

  useEffect(() => {
    if (user) {
      // Fetch user's currency preference from profile
      supabase
        .from('users')
        .select('currency')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.currency) {
            setCurrencyState(data.currency);
            localStorage.setItem('currency', data.currency);
            setCurrencyVersion(v => v + 1);
          } else {
            // If user doesn't have a currency set, detect from location
            detectLocationCurrency();
          }
        });
    }
  }, [user, detectLocationCurrency]);

  const refreshCurrency = async () => {
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('currency')
        .eq('user_id', user.id)
        .single();

      if (data?.currency) {
        setCurrencyState(data.currency);
        localStorage.setItem('currency', data.currency);
        setCurrencyVersion(v => v + 1);
      }
    }
  };

  const setCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);
    setCurrencyVersion(v => v + 1);

    if (user) {
      await supabase
        .from('users')
        .update({ currency: newCurrency })
        .eq('user_id', user.id);
    }
  };

  const currencySymbol = currencyData[currency]?.symbol || '$';

  const formatAmount = useCallback((amount: number) => {
    const locale = currencyData[currency]?.locale || 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' || currency === 'KRW' || currency === 'VND' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' || currency === 'VND' ? 0 : 2,
    }).format(amount);
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      formatAmount,
      currencySymbol,
      refreshCurrency,
      currencyVersion
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export { currencyData };
