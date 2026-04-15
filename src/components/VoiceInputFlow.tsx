import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mic, Square, Check, AlertCircle, Sparkles, Plus,
  TrendingUp, TrendingDown, RefreshCw, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/base-modal-sheet';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { parseCurrencyFromString } from '@/lib/currencyUtils';

interface VoiceInputFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: { merchant?: string; amount?: number; currency?: string; type?: 'expense' | 'income' }) => void;
}

interface ParsedResult {
  merchant?: string;
  amount?: number;
  raw?: string;
  confidence?: 'high' | 'medium' | 'low' | 'none';
  currency?: string;
  type?: 'expense' | 'income';
}

type Phase = 'idle' | 'recording' | 'result';

const EXPENSE_TIPS = ['"Starbucks 500"', '"Spent 150 at restaurant"', '"Grocery 2500 taka"'];
const INCOME_TIPS  = ['"Salary 50000"',  '"Freelance 5000 dollars"', '"Received 1000 from client"'];

export function VoiceInputFlow({ open, onOpenChange, onComplete }: VoiceInputFlowProps) {
  const { listen, stop, parseCommand } = useVoiceInput();
  const { currency: userCurrency } = useCurrency();

  const [phase, setPhase]                     = useState<Phase>('idle');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [transcript, setTranscript]           = useState('');
  const [error, setError]                     = useState<string | null>(null);
  const [parsed, setParsed]                   = useState<ParsedResult>({});
  const [aiLoading, setAiLoading]             = useState(false);

  const reset = useCallback(() => {
    setPhase('idle');
    setTranscript('');
    setError(null);
    setTransactionType('expense');
    setParsed({});
    setAiLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      void stop();
      reset();
    }
  }, [open]);

  const handleRecord = async () => {
    setError(null);
    setTranscript('');
    setParsed({});
    setPhase('recording');
    try {
      const text = await listen();
      setTranscript(text);
      if (!text) {
        setPhase('idle');
        setError('No speech detected. Please try again.');
        return;
      }
      setPhase('result');

      setAiLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('parse-transaction', {
          body: { mode: 'voice', text, user_currency: userCurrency },
        });
        if (fnError || !data || (!data.merchant && !data.amount)) {
          throw new Error(fnError?.message || 'AI returned no usable data');
        }
        const textCurrency = parseCurrencyFromString(text);
        const extractedCurrency = data.currency || textCurrency || userCurrency;
        setParsed({
          merchant: data.merchant,
          amount: typeof data.amount === 'number' ? data.amount : undefined,
          currency: extractedCurrency,
          type: transactionType,
          confidence: data.confidence,
        });
      } catch (err) {
        console.warn('[VoiceInput] AI parsing failed, falling back to regex:', err);
        const fallbackResult = parseCommand(text) as ParsedResult;
        const textCurrency = parseCurrencyFromString(text);
        setParsed({
          ...fallbackResult,
          currency: fallbackResult.currency || textCurrency || userCurrency,
        });
      } finally {
        setAiLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  };

  const handleStop = () => {
    void stop();
  };

  const handleMicTap = () => {
    if (phase === 'idle') {
      void handleRecord();
    } else if (phase === 'recording') {
      handleStop();
    }
  };

  const handleClose = () => {
    void stop();
    reset();
    onOpenChange(false);
  };

  const handleRetry = () => {
    setTranscript('');
    setError(null);
    setParsed({});
    setAiLoading(false);
    setPhase('idle');
  };

  const hasParsedData = !!(parsed.merchant || parsed.amount);

  const handleUseTranscript = () => {
    onComplete({
      merchant: parsed.merchant,
      amount: parsed.amount,
      currency: parsed.currency,
      type: transactionType,
    });
    handleClose();
  };

  const handleAddManually = () => {
    onComplete({ type: transactionType });
    handleClose();
  };

  const tips = transactionType === 'income' ? INCOME_TIPS : EXPENSE_TIPS;
  const isRecording = phase === 'recording';

  return (
    <BaseModalSheet open={open} onOpenChange={onOpenChange}>
      <SheetBackdrop onClick={handleClose} />
      <SheetContainer>
        <SheetHeader>
          <SheetTitle>Voice Input</SheetTitle>
          <SheetClose onClick={handleClose} />
        </SheetHeader>
        <SheetContent>
          <div className="space-y-5 px-1">
            {/* Transaction type toggle */}
            <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
              <button
                onClick={() => setTransactionType('expense')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
                  transactionType === 'expense'
                    ? "bg-red-500 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingDown className="w-4 h-4" />
                Expense
              </button>
              <button
                onClick={() => setTransactionType('income')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
                  transactionType === 'income'
                    ? "bg-green-500 text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Income
              </button>
            </div>

            {/* Mic button */}
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <motion.button
                onClick={handleMicTap}
                whileTap={{ scale: 0.92 }}
                className={cn(
                  "relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg",
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-accent hover:bg-accent/90",
                )}
              >
                {isRecording ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Square className="w-7 h-7 text-white fill-white" />
                  </motion.div>
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
                {isRecording && (
                  <span className="absolute -bottom-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    REC
                  </span>
                )}
              </motion.button>
              <div className="text-center space-y-1">
                {phase === 'idle' && !error && (
                  <p className="text-sm text-muted-foreground">
                    Select a type, then tap the mic to start
                  </p>
                )}
                {phase === 'recording' && (
                  <p className="text-sm text-muted-foreground animate-pulse">Listening…</p>
                )}
              </div>
            </div>

            {error && phase !== 'recording' && (
              <Card className="w-full bg-destructive/5 border-destructive/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-destructive flex-1">{error}</p>
                </div>
              </Card>
            )}

            {phase === 'result' && (
              <div className="w-full space-y-3">
                {transcript ? (
                  <Card className="bg-muted/50 p-4 border-border/50">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Recognized:</p>
                        <p className="text-sm font-mono text-foreground/80">"{transcript}"</p>
                      </div>
                      <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                        {aiLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 text-accent animate-spin mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">Analyzing with AI…</p>
                          </>
                        ) : hasParsedData ? (
                          <>
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-muted-foreground">Extracted:</p>
                                {parsed.confidence && parsed.confidence !== 'high' && (
                                  <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                    parsed.confidence === 'medium'
                                      ? "bg-yellow-500/15 text-yellow-600"
                                      : "bg-orange-500/15 text-orange-600",
                                  )}>
                                    {parsed.confidence} confidence
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                {parsed.merchant && (
                                  <span className="text-sm font-medium capitalize">
                                    {parsed.merchant}
                                  </span>
                                )}
                                {parsed.amount && (
                                  <span className={cn(
                                    "text-sm font-bold",
                                    transactionType === 'income' ? "text-green-600" : "text-red-600",
                                  )}>
                                    {transactionType === 'income' ? '+' : '-'}
                                    {parsed.amount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-orange-600 flex-1">
                              Could not extract merchant or amount — try again or add manually
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <p className="text-sm text-center text-muted-foreground">
                    No speech detected. Try again.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleRetry} className="flex-1" disabled={aiLoading}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  {hasParsedData && !aiLoading ? (
                    <Button
                      onClick={handleUseTranscript}
                      className={cn(
                        "flex-1",
                        transactionType === 'income'
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-accent hover:bg-accent/90",
                      )}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Use This
                    </Button>
                  ) : !aiLoading ? (
                    <Button variant="outline" onClick={handleAddManually} className="flex-1">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manually
                    </Button>
                  ) : null}
                </div>
              </div>
            )}

            {phase === 'idle' && (
              <div className="w-full p-3 bg-muted/30 rounded-lg border border-border/30">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">
                      {transactionType === 'income' ? 'Income examples:' : 'Expense examples:'}
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      {tips.map(tip => <li key={tip}>{tip}</li>)}
                      <li>Speak clearly and include an amount</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </SheetContainer>
    </BaseModalSheet>
  );
}
