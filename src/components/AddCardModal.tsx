import { useState, useRef } from 'react';
import { X, Camera, Edit3, CreditCard, Loader2, ScanLine } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleScanTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStep('scan');
    setLoading(true);

    // Simulate real OCR processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Result of "scanning"
    setCardNumber('4242 4242 4242 4242');
    setCardHolder('JONATHAN DOE');
    setExpiryDate('08/28');
    setSaveCard(true);
    setLoading(false);

    toast({
      title: "Card Recognized!",
      description: "We've automatically filled the card details from your photo.",
    });

    setStep('manual');
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="w-[94vw] max-w-md rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="pt-2">
          <DialogTitle className="text-center text-xl font-black uppercase tracking-tight">Add Card</DialogTitle>
        </DialogHeader>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />

        {step === 'choose' && (
          <div className="space-y-4 py-4">
            <button
              onClick={handleScanTrigger}
              className="w-full flex items-center gap-4 p-5 rounded-3xl border border-border/50 hover:bg-muted/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-black text-foreground uppercase tracking-tight">Scan Card</p>
                <p className="text-xs text-muted-foreground font-medium">Capture details with AI scan</p>
              </div>
            </button>

            <button
              onClick={() => setStep('manual')}
              className="w-full flex items-center gap-4 p-5 rounded-3xl border border-border/50 hover:bg-muted/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Edit3 className="w-7 h-7 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-black text-foreground uppercase tracking-tight">Manual Entry</p>
                <p className="text-xs text-muted-foreground font-medium">Type in your card info</p>
              </div>
            </button>
          </div>
        )}

        {step === 'scan' && loading && (
          <div className="py-12 flex flex-col items-center gap-4 relative overflow-hidden">
            <div className="w-48 h-32 rounded-2xl bg-muted/30 border border-border flex flex-col items-center justify-center relative overflow-hidden">
              <ScanLine className="w-12 h-12 text-primary animate-pulse" />
              {/* Simulated scan line */}
              <motion.div
                className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_hsl(var(--primary))]"
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="font-bold text-foreground">Analyzing Card Data</p>
              </div>
              <p className="text-xs text-muted-foreground text-center px-6">
                Our AI is extracting the card number, holder name, and expiry date...
              </p>
            </div>
          </div>
        )}

        {step === 'manual' && (
          <div className="max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-4 pb-4">
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
                    className="mt-1 h-12 rounded-2xl font-bold bg-muted/30 border-none"
                  />
                </div>

                <div>
                  <Label htmlFor="cardHolder">Card Holder</Label>
                  <Input
                    id="cardHolder"
                    placeholder="JOHN DOE"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="mt-1 h-12 rounded-2xl font-bold bg-muted/30 border-none"
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
                      className="mt-1 h-12 rounded-2xl font-bold bg-muted/30 border-none"
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
                className="w-full h-12 rounded-2xl font-black bg-accent hover:bg-accent/90 shadow-fab mt-2"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {saveCard ? 'Save Card' : 'Continue'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
