import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatAmount: (amount: number) => string;
  currencySymbol: string;
}

const currencyData: Record<string, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  BDT: { symbol: '৳', name: 'Bangladeshi Taka' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  KRW: { symbol: '₩', name: 'South Korean Won' },
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('currency') || 'USD';
  });

  useEffect(() => {
    if (user) {
      // Fetch user's currency preference from profile
      supabase
        .from('profiles')
        .select('currency')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.currency) {
            setCurrencyState(data.currency);
            localStorage.setItem('currency', data.currency);
          }
        });
    }
  }, [user]);

  const setCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);

    if (user) {
      await supabase
        .from('profiles')
        .update({ currency: newCurrency })
        .eq('user_id', user.id);
    }
  };

  const currencySymbol = currencyData[currency]?.symbol || '$';

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, currencySymbol }}>
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
