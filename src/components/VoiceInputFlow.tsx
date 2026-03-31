import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mic, Square, Check, AlertCircle, Sparkles, Plus,
  TrendingUp, TrendingDown, RefreshCw, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

  // ── Reset when sheet closes ───────────────────────────────────────────────

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
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Core handler — one async function, zero useEffects for transitions ──

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

      // Try AI extraction; fall back to regex on failure
      setAiLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('parse-transaction', {
          body: { mode: 'voice', text, user_currency: userCurrency },
        });
        if (fnError || !data || (!data.merchant && !data.amount)) {
          throw new Error('AI returned no usable data');
        }
        setParsed({
          merchant: data.merchant,
          amount: typeof data.amount === 'number' ? data.amount : undefined,
          currency: data.currency,
          type: transactionType,
          confidence: data.confidence,
        });
      } catch {
        setParsed(parseCommand(text) as ParsedResult);
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
    // stop() triggers Android to finalize → listen() promise resolves → handleRecord continues
  };

  // ── Button handler ────────────────────────────────────────────────────────

  const handleMicTap = () => {
    if (phase === 'idle') {
      void handleRecord();
    } else if (phase === 'recording') {
      handleStop();
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

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

  // ── Derived UI ────────────────────────────────────────────────────────────

  const tips = transactionType === 'income' ? INCOME_TIPS : EXPENSE_TIPS;

  const micLabel =
    phase === 'recording' ? 'Tap to stop' :
    phase === 'result'    ? 'Done'         : 'Tap to record';

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}
      title="Voice Input"
      className="max-h-[85vh]"
    >
      {/* ── Voice UI ── */}
      <div className="flex flex-col items-center gap-5">

        {/* Type selector — always visible; read-only while recording */}
        <div className="w-full flex rounded-xl border border-border overflow-hidden">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              onClick={() => phase !== 'recording' && setTransactionType(t)}
              className={cn(
                "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
                phase === 'recording' && "opacity-50 cursor-not-allowed",
                t === 'expense' && transactionType === 'expense' && "bg-red-500/15 text-red-500",
                t === 'income'  && transactionType === 'income'  && "bg-green-500/15 text-green-500",
                transactionType !== t && "text-muted-foreground",
              )}
            >
              {t === 'expense'
                ? <TrendingDown className="w-4 h-4" />
                : <TrendingUp   className="w-4 h-4" />
              }
              {t === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        {/* Mic button */}
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          {phase === 'recording' && (
            <>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                className="absolute w-36 h-36 rounded-full bg-red-500/30 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.3, ease: 'easeInOut' }}
                className="absolute w-36 h-36 rounded-full bg-red-500/20 pointer-events-none"
              />
            </>
          )}

          <button
            onClick={handleMicTap}
            disabled={phase === 'result'}
            className={cn(
              "relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center gap-2",
              "transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
              phase === 'recording' ? "bg-red-500/15" : "bg-accent/10",
            )}
          >
            {phase === 'recording'
              ? <Square className="w-12 h-12 text-red-500" />
              : <Mic    className="w-12 h-12 text-accent" />
            }
            <span className="text-xs font-medium text-muted-foreground">
              {micLabel}
            </span>
          </button>
        </div>

        {/* Status */}
        <div className="w-full text-center min-h-[2rem]">
          {phase === 'idle' && !error && (
            <p className="text-sm text-muted-foreground">
              Select a type, then tap the mic to start
            </p>
          )}
          {phase === 'recording' && (
            <p className="text-sm text-muted-foreground animate-pulse">Listening…</p>
          )}
        </div>

        {/* Error */}
        {error && phase !== 'recording' && (
          <Card className="w-full bg-destructive/5 border-destructive/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive flex-1">{error}</p>
            </div>
          </Card>
        )}

        {/* Result card */}
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

        {/* Tips — idle only */}
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
    </ResponsiveDrawer>
  );
}
