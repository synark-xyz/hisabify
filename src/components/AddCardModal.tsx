import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Edit3, CreditCard, Loader2, ScanLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { createWorker } from 'tesseract.js';
import { number as validateCardNumber } from 'card-validator';
// ... other imports

export function AddCardModal({ open, onOpenChange, onSuccess }: AddCardModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [loading, setLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cardColor, setCardColor] = useState<CardColor>('purple');
  const [saveCard, setSaveCard] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();
  const { currency } = useCurrency();
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

      // Adjust random balance based on currency (approximate)
      const isHighValueCurrency = ['JPY', 'KRW', 'VND', 'IDR'].includes(currency);
      const baseBalance = Math.floor(Math.random() * 50000) + 10000;
      const finalBalance = isHighValueCurrency ? baseBalance * 100 : baseBalance;

      const { error } = await supabase.from('cards').insert({
        user_id: user.id,
        card_number: maskedNumber, // Only last 4 digits stored
        card_holder: cardHolder,
        expiry_date: expiryDate,
        card_type: detectCardType(cleaned),
        color: cardColor,
        balance: finalBalance,
        // currency: currency, // Uncomment if schema supports it
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

  const startCamera = async () => {
    setStep('scan');
    setLoading(false); // We are not "loading" in the sense of waiting, we are "active"
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast({ title: "Camera Error", description: "Could not access camera. Please enter details manually.", variant: "destructive" });
      setStep('choose');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Stop camera when modal closes or unmounts
  useEffect(() => {
    if (!open) {
      stopCamera();
      resetForm();
    }
    return () => stopCamera();
  }, [open]);

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true); // Show processing state

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');

        const worker = await createWorker('eng', 1, {
          workerPath: '/worker.min.js',
          corePath: '/tesseract-core.wasm.js',
        });
        const ret = await worker.recognize(dataUrl);
        const text = ret.data.text;
        await worker.terminate();

        console.log("OCR Text:", text);

        // Process Text
        // 1. Card Number
        const potentialNumbers = text.match(/(?:\d[ -]*?){13,19}/g) || [];
        let foundNumber = '';

        for (const num of potentialNumbers) {
          const raw = num.replace(/[^0-9]/g, '');
          const validation = validateCardNumber(raw);
          if (validation.isValid) {
            foundNumber = raw;
            break;
          }
        }

        // 2. Expiry Date
        const dateMatch = text.match(/\b(0[1-9]|1[0-2])\/?([0-9]{2,4})\b/);
        const foundDate = dateMatch ? `${dateMatch[1]}/${dateMatch[2].slice(-2)}` : '';

        // 3. Name (Heuristic)
        const lines = text.split('\n');
        let foundName = '';
        for (const line of lines) {
          const trimmed = line.trim().toUpperCase();
          if (/^[A-Z ]+$/.test(trimmed) && trimmed.length > 5 && trimmed.includes(' ')) {
            if (!['VISA', 'MASTERCARD', 'The', 'VALiD', 'THRU'].some(w => trimmed.includes(w.toUpperCase()))) {
              foundName = trimmed;
              break;
            }
          }
        }

        if (foundNumber || foundDate) {
          if (foundNumber) setCardNumber(formatCardNumber(foundNumber));
          if (foundDate) setExpiryDate(foundDate);
          if (foundName) setCardHolder(foundName);
          setSaveCard(true);

          toast({ title: "Card Scanned", description: "Details extracted successfully." });
          stopCamera();
          setStep('manual');
        } else {
          toast({ title: "No details found", description: "Try creating better lighting or alignment.", variant: "destructive" });
        }
      }

    } catch (err) {
      console.error(err);
      toast({ title: "Scanning failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-md rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="pt-2">
          <DialogTitle className="text-center text-xl font-black uppercase tracking-tight">Add Card</DialogTitle>
        </DialogHeader>

        {/* Hidden Canvas for Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {step === 'choose' && (
          <div className="space-y-4 py-4">
            <button
              onClick={startCamera}
              className="w-full flex items-center gap-4 p-5 rounded-3xl border border-border/50 hover:bg-muted/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-black text-foreground uppercase tracking-tight">Scan Card</p>
                <p className="text-xs text-muted-foreground font-medium">Capture details with Camera</p>
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

        {step === 'scan' && (
          <div className="relative flex flex-col items-center">
            <div className="relative w-full aspect-[1.58] bg-black rounded-xl overflow-hidden mb-4 shadow-2xl">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

              {/* Overlay Guide */}
              <div className="absolute inset-0 border-[3px] border-white/30 m-4 rounded-xl pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-xl -mt-[3px] -ml-[3px]" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-xl -mt-[3px] -mr-[3px]" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-xl -mb-[3px] -ml-[3px]" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-xl -mb-[3px] -mr-[3px]" />
              </div>

              {/* Scan Line Animation */}
              <motion.div
                className="absolute left-4 right-4 h-[2px] bg-primary/80 shadow-[0_0_10px_rgba(var(--primary),0.8)]"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />

              {loading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                  <p className="text-white font-bold text-sm">Processing...</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => { stopCamera(); setStep('choose'); }}>Cancel</Button>
              <Button className="flex-[2]" onClick={captureAndProcess} disabled={loading}>
                {loading ? 'Scanning...' : 'Capture & Scan'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Align your card within the frame and tap Capture.
            </p>
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
