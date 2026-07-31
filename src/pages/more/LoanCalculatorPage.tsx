import { useReducer, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Landmark, Crown } from 'lucide-react';
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

type LoanState = {
  principal: string;
  interestRate: string;
  tenureMonths: string;
  result: {
    emi: number;
    totalInterest: number;
    totalPayment: number;
  } | null;
};

type LoanAction =
  | { type: 'setPrincipal'; payload: string }
  | { type: 'setInterestRate'; payload: string }
  | { type: 'setTenureMonths'; payload: string }
  | { type: 'calculate' }
  | { type: 'reset' };

const initialState: LoanState = {
  principal: '',
  interestRate: '',
  tenureMonths: '',
  result: null,
};

function loanReducer(state: LoanState, action: LoanAction): LoanState {
  switch (action.type) {
    case 'setPrincipal':
      return { ...state, principal: action.payload, result: null };
    case 'setInterestRate':
      return { ...state, interestRate: action.payload, result: null };
    case 'setTenureMonths':
      return { ...state, tenureMonths: action.payload, result: null };
    case 'calculate': {
      const P = parseFloat(state.principal);
      const R = parseFloat(state.interestRate) / 12 / 100;
      const N = parseInt(state.tenureMonths);

      if (isNaN(P) || isNaN(R) || isNaN(N) || P <= 0 || R <= 0 || N <= 0) {
        return state;
      }

      const emi = P * R * Math.pow(1 + R, N) / (Math.pow(1 + R, N) - 1);
      const totalPayment = emi * N;
      const totalInterest = totalPayment - P;

      return {
        ...state,
        result: {
          emi: Math.round(emi * 100) / 100,
          totalInterest: Math.round(totalInterest * 100) / 100,
          totalPayment: Math.round(totalPayment * 100) / 100,
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

export function LoanCalculatorPage() {
  const navigate = useNavigate();
  const { currency: defaultCurrency, formatAmount } = useCurrency();
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [state, dispatch] = useReducer(loanReducer, initialState);
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
    <PageShell title="loanCalculator.title" backTo="/more" withBottomNav className="px-0 py-0">

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5" />
          {t('loanCalculator.title')}
        </h2>

        {/* Currency Selector (Pro Feature) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="currency">{t('loanCalculator.currency')}</Label>
            <div className="flex items-center gap-1">
              {!isPremium && <Crown className="w-3 h-3 text-accent" />}
              <span className={`text-xs ${!isPremium ? 'text-accent' : 'text-muted-foreground'}`}>
                {isPremium ? t('loanCalculator.customizable') : t('loanCalculator.pro')}
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
            <Label htmlFor="principal">{t('loanCalculator.loanAmount')}</Label>
            <Input
              id="principal"
              type="number"
              placeholder={t('loanCalculator.placeholder')}
              value={state.principal}
              onChange={(e) => dispatch({ type: 'setPrincipal', payload: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">{t('loanCalculator.interestRate')}</Label>
            <Input
              id="rate"
              type="number"
              placeholder="8.5"
              value={state.interestRate}
              onChange={(e) => dispatch({ type: 'setInterestRate', payload: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenure">{t('loanCalculator.tenureMonths')}</Label>
            <Input
              id="tenure"
              type="number"
              placeholder="24"
              value={state.tenureMonths}
              onChange={(e) => dispatch({ type: 'setTenureMonths', payload: e.target.value })}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => dispatch({ type: 'calculate' })}>
            {t('loanCalculator.calculateEmi')}
          </Button>
          <Button variant="outline" onClick={() => dispatch({ type: 'reset' })}>
            {t('loanCalculator.reset')}
          </Button>
        </div>

        {/* Results */}
        {state.result && (
          <div className="space-y-4 bg-card rounded-2xl p-6 border border-border/30">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">{t('loanCalculator.monthlyEmi')}</p>
              <p className="text-3xl font-bold text-primary">{formatWithCurrency(state.result.emi)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/5 rounded-xl">
                <p className="text-sm text-muted-foreground">{t('loanCalculator.totalInterest')}</p>
                <p className="text-lg font-semibold">{formatWithCurrency(state.result.totalInterest)}</p>
              </div>
              <div className="text-center p-4 bg-primary/5 rounded-xl">
                <p className="text-sm text-muted-foreground">{t('loanCalculator.totalPayment')}</p>
                <p className="text-lg font-semibold">{formatWithCurrency(state.result.totalPayment)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} source="loan_calculator" />
    </PageShell>
  );
}
