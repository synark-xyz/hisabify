import { useState, useEffect } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Category, Transaction } from '@/types';

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSuccess: () => void;
}

const incomeSources = [
  { id: 'salary', name: 'Salary', icon: '💼' },
  { id: 'freelance', name: 'Freelance', icon: '💻' },
  { id: 'investment', name: 'Investment', icon: '📈' },
  { id: 'rental', name: 'Rental Income', icon: '🏠' },
  { id: 'gift', name: 'Gift', icon: '🎁' },
  { id: 'refund', name: 'Refund', icon: '💰' },
  { id: 'other', name: 'Other', icon: '📝' },
];

export function EditTransactionModal({ open, onOpenChange, transaction, onSuccess }: EditTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [incomeSource, setIncomeSource] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [convertedPreview, setConvertedPreview] = useState<{ amount: number; rate: number } | null>(null);
  const { toast } = useToast();
  const { currency } = useCurrency();
  const { convertAmount, loading: rateLoading } = useExchangeRate();

  useEffect(() => {
    if (open && transaction) {
      fetchCategories();
      setMerchant(transaction.merchant);
      setAmount(String(transaction.amount_original || transaction.amount));
      setCategoryId(transaction.category?.id || '');
      setSelectedCurrency(transaction.currency_original || currency);
      setIncomeSource(transaction.note || '');
    }
  }, [open, transaction, currency]);

  useEffect(() => {
    const previewConversion = async () => {
      if (!amount || selectedCurrency === currency) {
        setConvertedPreview(null);
        return;
      }

      const result = await convertAmount(parseFloat(amount), selectedCurrency, currency);
      if (result) {
        setConvertedPreview({
          amount: result.convertedAmount,
          rate: result.rate
        });
      }
    };

    const debounce = setTimeout(previewConversion, 500);
    return () => clearTimeout(debounce);
  }, [amount, selectedCurrency, currency]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data as Category[]);
  };

  const handleSubmit = async () => {
    if (!transaction || !merchant || !amount) return;
    if (transaction.type === 'expense' && !categoryId) return;

    setLoading(true);
    try {
      const originalAmount = parseFloat(amount);
      let convertedAmount = originalAmount;
      let exchangeRate = 1;
      let exchangeSource = 'same_currency';
      let rateTimestamp = new Date().toISOString();

      if (selectedCurrency !== currency) {
        const conversionResult = await convertAmount(originalAmount, selectedCurrency, currency);
        
        if (conversionResult) {
          convertedAmount = conversionResult.convertedAmount;
          exchangeRate = conversionResult.rate;
          exchangeSource = conversionResult.source;
          rateTimestamp = conversionResult.timestamp;
        }
      }

      const { error } = await supabase
        .from('transactions')
        .update({
          merchant,
          amount: convertedAmount,
          amount_original: originalAmount,
          currency_original: selectedCurrency,
          amount_converted: convertedAmount,
          currency_base: currency,
          exchange_rate: exchangeRate,
          rate_timestamp: rateTimestamp,
          exchange_source: exchangeSource,
          category_id: transaction.type === 'expense' ? categoryId : null,
          note: transaction.type === 'income' ? incomeSource : null,
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast({ title: 'Transaction updated!' });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const currencySymbol = currencyData[selectedCurrency]?.symbol || '$';
  const baseCurrencySymbol = currencyData[currency]?.symbol || '$';

  if (!transaction) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">Edit {transaction.type === 'expense' ? 'Expense' : 'Income'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="merchant">
              {transaction.type === 'expense' ? 'Merchant / Description' : 'Source / Description'}
            </Label>
            <Input
              id="merchant"
              placeholder={transaction.type === 'expense' ? 'e.g., Starbucks' : 'e.g., Monthly Salary'}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2 mt-1">
              <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-20 flex items-center justify-between px-3"
                  >
                    <span>{currencySymbol}</span>
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  <div className="max-h-60 overflow-y-auto">
                    {Object.entries(currencyData).map(([code, { symbol }]) => (
                      <button
                        key={code}
                        onClick={() => {
                          setSelectedCurrency(code);
                          setCurrencyOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors ${
                          selectedCurrency === code ? 'bg-muted' : ''
                        }`}
                      >
                        <span className="w-6 text-center font-medium">{symbol}</span>
                        <span className="text-muted-foreground">{code}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
            </div>
            
            {selectedCurrency !== currency && amount && (
              <div className="mt-2 text-sm">
                {rateLoading ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Converting...
                  </span>
                ) : convertedPreview ? (
                  <span className="text-muted-foreground">
                    ≈ {baseCurrencySymbol}{convertedPreview.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                    <span className="text-xs ml-1">(1 {selectedCurrency} = {convertedPreview.rate.toFixed(4)} {currency})</span>
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {transaction.type === 'expense' && (
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {transaction.type === 'income' && (
            <div>
              <Label>Income Source</Label>
              <Select value={incomeSource} onValueChange={setIncomeSource}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {incomeSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      <span className="flex items-center gap-2">
                        <span>{source.icon}</span>
                        <span>{source.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !merchant || !amount}
              className="flex-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
