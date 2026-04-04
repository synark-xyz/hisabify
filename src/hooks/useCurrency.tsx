import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useExchangeRate } from './useExchangeRate';
import { startExchangeRateService } from '@/lib/exchangeRateService';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => Promise<void>;
  formatAmount: (amount: number) => string;
  currencySymbol: string;
  refreshCurrency: () => Promise<void>;
  currencyVersion: number; // Used to trigger re-renders when currency changes
}

const currencyData: Record<string, { symbol: string; name: string; locale: string }> = {
  // Major Currencies
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  CNY: { symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  
  // Asian Currencies
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  PKR: { symbol: '₨', name: 'Pakistani Rupee', locale: 'en-PK' },
  BDT: { symbol: '৳', name: 'Bangladeshi Taka', locale: 'bn-BD' },
  KRW: { symbol: '₩', name: 'South Korean Won', locale: 'ko-KR' },
  THB: { symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
  PHP: { symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah', locale: 'id-ID' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY' },
  VND: { symbol: '₫', name: 'Vietnamese Dong', locale: 'vi-VN' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', locale: 'zh-HK' },
  
  // Middle Eastern Currencies
  AED: { symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  SAR: { symbol: '﷼', name: 'Saudi Riyal', locale: 'ar-SA' },
  ILS: { symbol: '₪', name: 'Israeli Shekel', locale: 'he-IL' },
  
  // European Currencies
  CHF: { symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
  SEK: { symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
  DKK: { symbol: 'kr', name: 'Danish Krone', locale: 'da-DK' },
  PLN: { symbol: 'zł', name: 'Polish Zloty', locale: 'pl-PL' },
  CZK: { symbol: 'Kč', name: 'Czech Koruna', locale: 'cs-CZ' },
  HUF: { symbol: 'Ft', name: 'Hungarian Forint', locale: 'hu-HU' },
  TRY: { symbol: '₺', name: 'Turkish Lira', locale: 'tr-TR' },
  
  // Americas
  CAD: { symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar', locale: 'en-NZ' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  MXN: { symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
  ARS: { symbol: 'AR$', name: 'Argentine Peso', locale: 'es-AR' },
  CLP: { symbol: 'CL$', name: 'Chilean Peso', locale: 'es-CL' },
  COP: { symbol: 'CO$', name: 'Colombian Peso', locale: 'es-CO' },
  
  // African Currencies
  ZAR: { symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  NGN: { symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  EGP: { symbol: 'E£', name: 'Egyptian Pound', locale: 'ar-EG' },
  
  // Russian & Ukrainian
  RUB: { symbol: '₽', name: 'Russian Ruble', locale: 'ru-RU' },
  UAH: { symbol: '₴', name: 'Ukrainian Hryvnia', locale: 'uk-UA' },
};

// Map country codes to currency codes
const countryCurrencyMap: Record<string, string> = {
  // North America
  US: 'USD', CA: 'CAD', MX: 'MXN',
  // South America
  BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
  // Europe
  GB: 'GBP', EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', 
  NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
  CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  // Middle East
  AE: 'AED', SA: 'SAR', IL: 'ILS', TR: 'TRY',
  // Africa
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', EG: 'EGP', BD: 'BDT',
  // Asia
  JP: 'JPY', CN: 'CNY', IN: 'INR', PK: 'PKR', KR: 'KRW', TH: 'THB', 
  PH: 'PHP', ID: 'IDR', MY: 'MYR', VN: 'VND', SG: 'SGD', HK: 'HKD',
  // Oceania
  AU: 'AUD', NZ: 'NZD',
  // Russia & Ukraine
  RU: 'RUB', UA: 'UAH',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { prefetchRates } = useExchangeRate();
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('currency') || 'USD';
  });
  const [currencyVersion, setCurrencyVersion] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get a valid currency (ensure it's in supported list)
  const getValidCurrency = (curr: string): string => {
    return currencyData[curr] ? curr : 'USD';
  };

  // Detect location and set default currency
  const detectLocationCurrency = useCallback(async () => {
    if (isInitialized) return;

    // Check if user already has a currency preference
    const storedCurrency = localStorage.getItem('currency');
    if (storedCurrency && currencyData[storedCurrency]) {
      // User has a valid currency set, use it
      setIsInitialized(true);
      return;
    }

    try {
      // 1. Try Geolocation API (This "Asks for location")
      const getPosition = () => {
        return new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) reject('Geolocation not supported');
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
      };

      try {
        const position = await getPosition();
        const { latitude, longitude } = position.coords;

        // Free reverse geocoding
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await response.json();
        const countryCode = data.countryCode;
        const detectedCurrency = countryCurrencyMap[countryCode];
        const validCurrency = getValidCurrency(detectedCurrency || 'USD');

        setCurrencyState(validCurrency);
        localStorage.setItem('currency', validCurrency);
        setCurrencyVersion(v => v + 1);
        setIsInitialized(true);
        return;
      } catch (geoError) {
        console.log('Geolocation denied or failed, falling back to IP');
      }

      // 2. Fallback to IP-based detection
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        const countryCode = data.country_code;
        const detectedCurrency = countryCurrencyMap[countryCode];
        const validCurrency = getValidCurrency(detectedCurrency || 'USD');

        setCurrencyState(validCurrency);
        localStorage.setItem('currency', validCurrency);
        setCurrencyVersion(v => v + 1);
        setIsInitialized(true);
        return;
      }
    } catch (error) {
      console.log('Could not detect location for currency');
    }
    // Fallback to USD if nothing works
    setCurrencyState('USD');
    localStorage.setItem('currency', 'USD');
    setCurrencyVersion(v => v + 1);
    setIsInitialized(true);
  }, [isInitialized]);

  // Run detection on mount (for non-logged in users or before profile loads)
  useEffect(() => {
    detectLocationCurrency();
  }, [detectLocationCurrency]);

  useEffect(() => {
    if (user && !isInitialized) {
      // Fetch user's currency preference from profile
      supabase
        .from('users')
        .select('currency')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.currency && currencyData[data.currency]) {
            // User has a currency set in profile, use it
            setCurrencyState(data.currency);
            localStorage.setItem('currency', data.currency);
            setCurrencyVersion(v => v + 1);
          }
          // Mark as initialized regardless - don't auto-detect for logged-in users
          setIsInitialized(true);
        });
    } else if (user) {
      // Already initialized, just mark as ready
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  // Background exchange rate service - runs every 24 hours
  useEffect(() => {
    if (user && currency) {
      // Start the background service (only updates if >24h since last update)
      startExchangeRateService(currency, prefetchRates);
    }
  }, [user, currency, prefetchRates]);

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
    // Zero-decimal currencies (no fractional units)
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'KRW'];
    const decimals = zeroDecimalCurrencies.includes(currency) ? 0 : 2;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
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
