import { useState, useEffect } from 'react';
import { Loader2, Camera, Edit3, CreditCard, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency, currencyData } from '@/hooks/useCurrency';
import { Category, Card } from '@/types';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Income sources
const incomeSources = [
  { id: 'salary', name: 'Salary', icon: '💼' },
  { id: 'freelance', name: 'Freelance', icon: '💻' },
  { id: 'investment', name: 'Investment', icon: '📈' },
  { id: 'rental', name: 'Rental Income', icon: '🏠' },
  { id: 'gift', name: 'Gift', icon: '🎁' },
  { id: 'refund', name: 'Refund', icon: '💰' },
  { id: 'other', name: 'Other', icon: '📝' },
];

type Step = 'type' | 'card-method' | 'card-scan' | 'form';

export function AddTransactionModal({ open, onOpenChange, onSuccess }: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [incomeSource, setIncomeSource] = useState('');
  const [cardId, setCardId] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [step, setStep] = useState<Step>('type');
  const [useCard, setUseCard] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency } = useCurrency();

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchCards();
      resetForm();
      setStep('type');
      setSelectedCurrency(currency);
    }
  }, [open, currency]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data as Category[]);
  };

  const fetchCards = async () => {
    if (!user) return;
    const { data } = await supabase.from('cards').select('*').eq('user_id', user.id);
    if (data) setCards(data as unknown as Card[]);
  };

  const handleSubmit = async () => {
    if (!user || !merchant || !amount) return;
    if (type === 'expense' && !categoryId) return;
    if (type === 'income' && !incomeSource) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        merchant,
        amount: parseFloat(amount),
        category_id: type === 'expense' ? categoryId : null,
        card_id: cardId || null,
        type,
        date: new Date().toISOString(),
        note: type === 'income' ? incomeSource : null,
      });

      if (error) throw error;

      toast({ title: `${type === 'expense' ? 'Expense' : 'Income'} added!` });
      onSuccess();
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMerchant('');
    setAmount('');
    setCategoryId('');
    setIncomeSource('');
    setCardId('');
    setType('expense');
    setUseCard(false);
  };

  const handleTypeSelect = (selectedType: 'expense' | 'income') => {
    setType(selectedType);
    if (selectedType === 'expense' && cards.length > 0) {
      setStep('card-method');
    } else {
      setStep('form');
    }
  };

  const handleCardMethod = (method: 'scan' | 'manual' | 'skip') => {
    if (method === 'scan') {
      setStep('card-scan');
      simulateOCR();
    } else if (method === 'manual') {
      setUseCard(true);
      setStep('form');
    } else {
      setStep('form');
    }
  };

  const simulateOCR = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate detected transaction from card
    if (cards.length > 0) {
      setCardId(cards[0].id);
    }
    setLoading(false);
    setUseCard(true);
    setStep('form');
  };

  const currencySymbol = currencyData[selectedCurrency]?.symbol || '$';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">
            {step === 'type' && 'Add Transaction'}
            {step === 'card-method' && 'Credit Card'}
            {step === 'card-scan' && 'Scanning...'}
            {step === 'form' && `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
          </SheetTitle>
        </SheetHeader>

        {/* Step 1: Choose Type */}
        {step === 'type' && (
          <div className="space-y-3 py-4">
            <button
              onClick={() => handleTypeSelect('expense')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Expense</p>
                <p className="text-sm text-muted-foreground">Track your spending</p>
              </div>
            </button>

            <button
              onClick={() => handleTypeSelect('income')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Income</p>
                <p className="text-sm text-muted-foreground">Record your earnings</p>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Card Method (for expenses) */}
        {step === 'card-method' && (
          <div className="space-y-3 py-4">
            <button
              onClick={() => handleCardMethod('scan')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Scan Card</p>
                <p className="text-sm text-muted-foreground">Use camera to detect card</p>
              </div>
            </button>

            <button
              onClick={() => handleCardMethod('manual')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Select Card</p>
                <p className="text-sm text-muted-foreground">Choose from your cards</p>
              </div>
            </button>

            <button
              onClick={() => handleCardMethod('skip')}
              className="w-full p-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip, continue without card
            </button>
          </div>
        )}

        {/* Step 3: Scanning */}
        {step === 'card-scan' && loading && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-muted-foreground">Detecting card...</p>
            </div>
          </div>
        )}

        {/* Step 4: Form */}
        {step === 'form' && (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="merchant">
                {type === 'expense' ? 'Merchant / Description' : 'Source / Description'}
              </Label>
              <Input
                id="merchant"
                placeholder={type === 'expense' ? 'e.g., Starbucks' : 'e.g., Monthly Salary'}
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
                      {Object.entries(currencyData).map(([code, { symbol, name }]) => (
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
            </div>

            {/* Category for Expense */}
            {type === 'expense' && (
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

            {/* Income Source */}
            {type === 'income' && (
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

            {/* Card Selection */}
            {useCard && cards.length > 0 && (
              <div>
                <Label>Card</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select card" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        <span className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>•••• {card.card_number.slice(-4)}</span>
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
                onClick={() => setStep('type')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !merchant || !amount || (type === 'expense' && !categoryId) || (type === 'income' && !incomeSource)}
                className="flex-1 bg-accent hover:bg-accent/90"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add {type === 'expense' ? 'Expense' : 'Income'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
