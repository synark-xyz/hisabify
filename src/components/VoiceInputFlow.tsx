import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, X, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: { merchant?: string; amount?: number }) => void;
}

export function VoiceInputFlow({ open, onOpenChange, onComplete }: VoiceInputFlowProps) {
  const { isListening, transcript, error, toggleListening, parseCommand } = useVoiceInput();
  const { checkMicrophonePermission } = usePermissions();
  const { toast } = useToast();
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied'>('checking');

  const checkPermission = useCallback(async () => {
    setPermissionStatus('checking');
    const result = await checkMicrophonePermission();

    if (result.status === 'granted') {
      setPermissionStatus('granted');
    } else if (result.status === 'denied') {
      setPermissionStatus('denied');
      toast({
        variant: 'destructive',
        title: 'Microphone Access Denied',
        description: result.message || 'Please enable microphone in device settings.'
      });
    } else {
      setPermissionStatus('granted'); // Prompt will show when user taps mic
    }
  }, [checkMicrophonePermission, toast]);

  // Check permission on mount
  useEffect(() => {
    if (open) {
      void checkPermission();
    }
  }, [open, checkPermission]);

  const handleClose = () => {
    if (isListening) {
      toggleListening();
    }
    onOpenChange(false);
  };

  const handleUseTranscript = () => {
    const parsed = parseCommand(transcript);
    if (parsed.merchant || parsed.amount) {
      onComplete(parsed);
      handleClose();
    } else {
      toast({
        variant: 'destructive',
        title: 'Cannot Parse Input',
        description: 'Please say something like "Starbucks $25" or "Taxi fifteen dollars"'
      });
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70]"
          />

          {/* Voice Input Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[71] max-w-md mx-auto"
          >
            <Card className="bg-card/95 backdrop-blur-xl border shadow-2xl p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold">Voice Input</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Main Content */}
              <div className="flex flex-col items-center gap-6">
                {/* Permission Denied State */}
                {permissionStatus === 'denied' && (
                  <div className="w-full">
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <MicOff className="w-8 h-8 text-destructive" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-destructive mb-1">
                          Microphone Access Denied
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enable microphone in device settings to use voice input
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Permission Granted - Voice UI */}
                {permissionStatus !== 'denied' && (
                  <>
                    {/* Microphone Button */}
                    <div className="relative">
                      <motion.button
                        onClick={toggleListening}
                        disabled={permissionStatus === 'checking'}
                        className={cn(
                          "w-32 h-32 rounded-full flex items-center justify-center relative transition-all duration-300 disabled:opacity-50",
                          isListening
                            ? "bg-red-500/10 hover:bg-red-500/20"
                            : "bg-accent/10 hover:bg-accent/20"
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {/* Pulse Animation (when listening) */}
                        {isListening && (
                          <>
                            <motion.div
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 0, 0.5]
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.5,
                                ease: 'easeInOut'
                              }}
                              className="absolute inset-0 rounded-full bg-red-500/30"
                            />
                            <motion.div
                              animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.7, 0, 0.7]
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 1.5,
                                delay: 0.3,
                                ease: 'easeInOut'
                              }}
                              className="absolute inset-0 rounded-full bg-red-500/20"
                            />
                          </>
                        )}

                        {/* Microphone Icon */}
                        {isListening ? (
                          <Mic className="w-12 h-12 text-red-500 relative z-10" />
                        ) : (
                          <Mic className="w-12 h-12 text-accent relative z-10" />
                        )}
                      </motion.button>

                      {/* Recording Indicator */}
                      {isListening && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                        >
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-medium text-red-500">Recording...</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Instruction Text */}
                    <div className="text-center space-y-1 mt-4">
                      {!isListening && !transcript && (
                        <>
                          <p className="text-sm font-medium">Tap to Start Recording</p>
                          <p className="text-xs text-muted-foreground">
                            Say "Grocery $50" or "Taxi fifteen dollars"
                          </p>
                        </>
                      )}

                      {isListening && !transcript && (
                        <>
                          <p className="text-sm font-medium animate-pulse">Listening...</p>
                          <p className="text-xs text-muted-foreground">
                            Speak clearly into your microphone
                          </p>
                        </>
                      )}
                    </div>

                    {/* Live Transcript */}
                    <AnimatePresence mode="wait">
                      {transcript && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="w-full"
                        >
                          <Card className="bg-muted/50 p-4 border-border/50">
                            <div className="space-y-3">
                              {/* Transcript Text */}
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Recognized:</p>
                                <p className="text-sm font-mono text-foreground/80">
                                  "{transcript}"
                                </p>
                              </div>

                              {/* Parsed Result */}
                              {(() => {
                                const parsed = parseCommand(transcript);
                                const hasParsedData = parsed.merchant || parsed.amount;

                                return (
                                  <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                                    {hasParsedData ? (
                                      <>
                                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-muted-foreground mb-1">Extracted:</p>
                                          <div className="flex items-center gap-3 flex-wrap">
                                            {parsed.merchant && (
                                              <span className="text-sm font-medium">
                                                {parsed.merchant}
                                              </span>
                                            )}
                                            {parsed.amount && (
                                              <span className="text-sm font-bold text-green-600">
                                                ${parsed.amount.toFixed(2)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          <p className="text-xs text-orange-600">
                                            Could not extract merchant or amount
                                          </p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Error Display */}
                    {error && !isListening && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full"
                      >
                        <Card className="bg-destructive/5 border-destructive/20 p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-destructive flex-1">{error}</p>
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex gap-2 mt-6">
                {transcript && !isListening && permissionStatus !== 'denied' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="flex-1"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={handleUseTranscript}
                      className="flex-1 bg-accent hover:bg-accent/90"
                      disabled={!parseCommand(transcript).merchant && !parseCommand(transcript).amount}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Use This
                    </Button>
                  </>
                )}
              </div>

              {/* Tips */}
              {!transcript && permissionStatus === 'granted' && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/30">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Tips for best results:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-1">
                        <li>Speak clearly and at normal pace</li>
                        <li>Include merchant name and amount</li>
                        <li>Example: "Coffee shop twenty dollars"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
