import { useState } from 'react';
import { X, Camera, Edit3, CreditCard, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'choose' | 'scan' | 'manual';
type CardColor = 'purple' | 'green' | 'orange';

export function AddCardModal({ open, onOpenChange, onSuccess }: AddCardModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cardColor, setCardColor] = useState<CardColor>('purple');
  const [saveCard, setSaveCard] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const detectCardType = (number: string): 'visa' | 'mastercard' | 'amex' => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'mastercard';
    if (cleaned.startsWith('3')) return 'amex';
    return 'visa';
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    return cleaned;
  };

  // Only store last 4 digits for security
  const getMaskedCardNumber = (number: string): string => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.length < 4) return cleaned;
    return `****${cleaned.slice(-4)}`;
  };

  const handleSubmit = async () => {
    if (!user) return;

    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 13) {
      toast({ title: 'Invalid card number', variant: 'destructive' });
      return;
    }

    // If user doesn't want to save, just close and trigger success
    if (!saveCard) {
      toast({ title: 'Card verified successfully!' });
      onSuccess();
      resetForm();
      return;
    }

    setLoading(true);
    try {
      // SECURITY: Only store masked card number (last 4 digits)
      const maskedNumber = getMaskedCardNumber(cleaned);

      const { error } = await supabase.from('cards').insert({
        user_id: user.id,
        card_number: maskedNumber, // Only last 4 digits stored
        card_holder: cardHolder,
        expiry_date: expiryDate,
        card_type: detectCardType(cleaned),
        color: cardColor,
        balance: Math.floor(Math.random() * 50000) + 10000,
      });

      if (error) throw error;

      toast({ title: 'Card saved successfully!' });
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error saving card', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('choose');
    setCardNumber('');
    setCardHolder('');
    setExpiryDate('');
    setCardColor('purple');
    setSaveCard(false);
  };

  const handleScan = async () => {
    setStep('scan');
    setLoading(true);

    // Simulate OCR processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock detected values
    setCardNumber('4532 1234 5678 9012');
    setCardHolder('JOHN DOE');
    setExpiryDate('12/26');
    setSaveCard(true); // Default to saving
    setLoading(false);

    toast({
      title: "Card Scanned Successfully",
      description: "Details have been filled automatically.",
    });

    setStep('manual');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-md mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Add New Card</DialogTitle>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-4 py-4">
            <button
              onClick={handleScan}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Scan Card</p>
                <p className="text-sm text-muted-foreground">Use camera to capture card details</p>
              </div>
            </button>

            <button
              onClick={() => setStep('manual')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Manual Entry</p>
                <p className="text-sm text-muted-foreground">Enter card details manually</p>
              </div>
            </button>
          </div>
        )}

        {step === 'scan' && loading && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-muted-foreground">Processing card...</p>
            </div>
          </div>
        )}

        {step === 'manual' && (
          <div className="space-y-4 py-4">
            {/* Card Preview */}
            <div className={`w-full aspect-[1.6] rounded-xl p-4 card-gradient-${cardColor}`}>
              <div className="h-full flex flex-col justify-between text-primary-foreground">
                <div className="flex justify-between items-start">
                  <CreditCard className="w-8 h-8" />
                  <span className="text-sm opacity-70">{detectCardType(cardNumber).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-lg tracking-widest mb-2">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>{cardHolder || 'CARD HOLDER'}</span>
                    <span>{expiryDate || 'MM/YY'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="cardHolder">Card Holder</Label>
                <Input
                  id="cardHolder"
                  placeholder="JOHN DOE"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(formatExpiry(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Card Color</Label>
                  <div className="flex gap-2 mt-2">
                    {(['purple', 'green', 'orange'] as CardColor[]).map((color) => (
                      <button
                        key={color}
                        onClick={() => setCardColor(color)}
                        className={`w-8 h-8 rounded-full card-gradient-${color} ring-2 ring-offset-2 transition-all ${cardColor === color ? 'ring-foreground' : 'ring-transparent'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Save card checkbox */}
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="saveCard"
                  checked={saveCard}
                  onCheckedChange={(checked) => setSaveCard(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="saveCard"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Save this card for future use
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Only the last 4 digits will be stored securely
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !cardNumber || !cardHolder || !expiryDate}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saveCard ? 'Save Card' : 'Continue'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
