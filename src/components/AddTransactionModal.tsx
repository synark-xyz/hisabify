import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Category, Card } from '@/types';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddTransactionModal({ open, onOpenChange, onSuccess }: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cardId, setCardId] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchCards();
    }
  }, [open]);

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
    if (!user || !merchant || !amount || !categoryId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        merchant,
        amount: parseFloat(amount),
        category_id: categoryId,
        card_id: cardId || null,
        type,
        date: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: 'Transaction added!' });
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
    setCardId('');
    setType('expense');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Add Transaction</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                type === 'expense' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                type === 'income' ? 'bg-green-500 text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <Label htmlFor="merchant">Merchant / Source</Label>
            <Input
              id="merchant"
              placeholder="e.g., Starbucks"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>

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

          {cards.length > 0 && (
            <div>
              <Label>Card (optional)</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      •••• {card.card_number.slice(-4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading || !merchant || !amount || !categoryId}
            className="w-full bg-accent hover:bg-accent/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
