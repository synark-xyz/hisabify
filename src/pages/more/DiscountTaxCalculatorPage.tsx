import { useReducer, useState } from 'react';
import { ChevronLeft, Percent, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/hooks/useCurrency';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { currencyData } from '@/hooks/useCurrency';
import { UpgradeModal } from '@/components/UpgradeModal';

type DiscountState = {
  originalPrice: string;
  discountPercent: string;
  taxPercent: string;
  result: {
    discountAmount: number;
    priceAfterDiscount: number;
    taxAmount: number;
    finalPrice: number;
  } | null;
};

type DiscountAction =
  | { type: 'setOriginalPrice'; payload: string }
  | { type: 'setDiscountPercent'; payload: string }
  | { type: 'setTaxPercent'; payload: string }
  | { type: 'calculate' }
  | { type: 'reset' };

const initialState: DiscountState = {
  originalPrice: '',
  discountPercent: '',
  taxPercent: '',
  result: null,
};

function discountReducer(state: DiscountState, action: DiscountAction): DiscountState {
  switch (action.type) {
    case 'setOriginalPrice':
      return { ...state, originalPrice: action.payload, result: null };
    case 'setDiscountPercent':
      return { ...state, discountPercent: action.payload, result: null };
    case 'setTaxPercent':
      return { ...state, taxPercent: action.payload, result: null };
    case 'calculate': {
      const price = parseFloat(state.originalPrice);
      const discount = parseFloat(state.discountPercent);
      const tax = parseFloat(state.taxPercent);

      if (isNaN(price) || isNaN(discount) || isNaN(tax) || price <= 0) {
        return state;
      }

      const discountAmount = (price * discount) / 100;
      const priceAfterDiscount = price - discountAmount;
      const taxAmount = (priceAfterDiscount * tax) / 100;
      const finalPrice = priceAfterDiscount + taxAmount;

      return {
        ...state,
        result: {
          discountAmount: Math.round(discountAmount * 100) / 100,
          priceAfterDiscount: Math.round(priceAfterDiscount * 100) / 100,
          taxAmount: Math.round(taxAmount * 100) / 100,
          finalPrice: Math.round(finalPrice * 100) / 100,
        },
      };
    }
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'HKD', 'SGD', 'KRW'];

export function DiscountTaxCalculatorPage() {
  const navigate = useNavigate();
  const { currency: defaultCurrency, formatAmount } = useCurrency();
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [state, dispatch] = useReducer(discountReducer, initialState);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(defaultCurrency);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleCurrencyChange = (newCurrency: string) => {
    if (!isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedCurrency(newCurrency);
  };

  const formatWithCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: selectedCurrency === 'JPY' ? 0 : 2,
      maximumFractionDigits: selectedCurrency === 'JPY' ? 0 : 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/more')} className="p-2 -ml-2 hover:bg-accent/10 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Percent className="w-5 h-5" /> {t('morePage.discountTax')}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Currency Selector (Pro Feature) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="currency">{t('discountTaxCalculator.currency')}</Label>
            <div className="flex items-center gap-1">
              {!isPremium && <Crown className="w-3 h-3 text-accent" />}
              <span className={`text-xs ${!isPremium ? 'text-accent' : 'text-muted-foreground'}`}>
                {isPremium ? t('discountTaxCalculator.customizable') : t('discountTaxCalculator.pro')}
              </span>
            </div>
          </div>
          <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
            <SelectTrigger id="currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_CURRENCIES.map((curr) => (
                <SelectItem key={curr} value={curr}>
                  {curr} - {currencyData[curr]?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">{t('discountTaxCalculator.originalPrice')}</Label>
            <Input
              id="price"
              type="number"
              placeholder="1000"
              value={state.originalPrice}
              onChange={(e) => dispatch({ type: 'setOriginalPrice', payload: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount">{t('discountTaxCalculator.discount')}</Label>
            <Input
              id="discount"
              type="number"
              placeholder="15"
              value={state.discountPercent}
              onChange={(e) => dispatch({ type: 'setDiscountPercent', payload: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax">{t('discountTaxCalculator.tax')}</Label>
            <Input
              id="tax"
              type="number"
              placeholder="18"
              value={state.taxPercent}
              onChange={(e) => dispatch({ type: 'setTaxPercent', payload: e.target.value })}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => dispatch({ type: 'calculate' })}>
            {t('discountTaxCalculator.calculate')}
          </Button>
          <Button variant="outline" onClick={() => dispatch({ type: 'reset' })}>
            {t('discountTaxCalculator.reset')}
          </Button>
        </div>

        {/* Results */}
        {state.result && (
          <div className="space-y-4 bg-card rounded-2xl p-6 border border-border/30">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">{t('discountTaxCalculator.finalPrice')}</p>
              <p className="text-3xl font-bold text-primary">{formatWithCurrency(state.result.finalPrice)}</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('discountTaxCalculator.discountPercent', { percent: state.discountPercent })}</span>
                <span className="font-medium text-green-600">-{formatWithCurrency(state.result.discountAmount)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('discountTaxCalculator.priceAfterDiscount')}</span>
                <span className="font-medium">{formatWithCurrency(state.result.priceAfterDiscount)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-xl">
                <span className="text-sm text-muted-foreground">{t('discountTaxCalculator.taxPercent', { percent: state.taxPercent })}</span>
                <span className="font-medium">+{formatWithCurrency(state.result.taxAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} source="discount_calculator" />
    </div>
  );
}
