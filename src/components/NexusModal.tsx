import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Camera, X, Sparkles, ChevronRight, Square, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PrivacyMask } from '@/components/ui/privacy-mask';
import { useProfile } from '@/hooks/useProfile';
import { ReceiptUpload } from '@/components/ReceiptUpload';
import { useVoiceInput } from '@/hooks/useVoiceInput';


type NexusMode = 'voice' | 'scan';

type SmartCapturePayload = {
    merchant?: string;
    amount?: number;
    raw?: string;
};

interface NexusModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSmartCapture: (data: SmartCapturePayload) => void;
    initialMode?: 'voice' | 'scan';
}

export function NexusModal({ open, onOpenChange, onSmartCapture, initialMode = 'voice' }: NexusModalProps) {
    const [mode, setMode] = useState<'voice' | 'scan'>(initialMode);
    const { privacyMode } = useProfile();

    // Update mode when initialMode changes or modal opens
    useEffect(() => {
        if (open) {
            setMode(initialMode);
        }
    }, [open, initialMode]);

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
                        onClick={() => onOpenChange(false)}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
                    />

                    {/* Nexus Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-x-4 bottom-24 md:bottom-28 z-[61] max-w-lg mx-auto"
                    >
                        <div className="bg-card/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden card-3d">

                            {/* Header / Mode Switcher */}
                            <div className="flex items-center justify-between p-2 bg-muted/40 border-b border-white/5">
                                <div className="flex bg-background/50 rounded-2xl p-1 gap-1">
                                    <InputModeButton
                                        active={mode === 'voice'}
                                        onClick={() => setMode('voice')}
                                        icon={Mic}
                                        label="Voice"
                                    />
                                    <InputModeButton
                                        active={mode === 'scan'}
                                        onClick={() => setMode('scan')}
                                        icon={Camera}
                                        label="Scan"
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onOpenChange(false)}
                                    className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Dynamic Content Area */}
                            <div className="p-4 min-h-[300px] flex flex-col relative">
                                <AnimatePresence mode="wait">
                                    {mode === 'voice' && (
                                        <VoiceModeContent
                                            onCommand={(data) => {
                                                console.log("Voice Command:", data);
                                                onSmartCapture(data);
                                            }}
                                        />
                                    )}

                                    {mode === 'scan' && (
                                        <motion.div
                                            key="scan"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="flex-1 flex flex-col items-center justify-center"
                                        >
                                            <div className="w-full max-w-sm space-y-4">
                                                <div className="text-center space-y-2 mb-8">
                                                    <h3 className="text-xl font-bold">Scan Receipt</h3>
                                                    <p className="text-muted-foreground text-sm">Auto-extract details • No image stored</p>
                                                </div>

                                                <ReceiptUpload
                                                    transient={true}
                                                    onChange={() => { }}
                                                    onScanComplete={(data) => {
                                                        console.log("Scan Data for Nexus:", data);
                                                        onSmartCapture({
                                                            merchant: data.merchant,
                                                            amount: data.amount ? parseFloat(data.amount) : undefined
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Privacy Indicator */}
                                {privacyMode && (
                                    <div className="absolute bottom-2 right-4 flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded-full">
                                        <Sparkles className="w-3 h-3" /> Stealth Mode Active
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function InputModeButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: LucideIcon, label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200",
                active
                    ? "bg-accent text-white shadow-lg shadow-accent/25"
                    : "hover:bg-muted text-muted-foreground"
            )}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

function VoiceModeContent({ onCommand }: { onCommand: (data: SmartCapturePayload) => void }) {
    const { listen, stop, parseCommand } = useVoiceInput();
    const [phase, setPhase] = useState<'idle' | 'recording' | 'result'>('idle');
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const parsed = transcript ? parseCommand(transcript) : {};

    const handleRecord = async () => {
        setError(null);
        setTranscript('');
        setPhase('recording');
        try {
            const text = await listen();
            setTranscript(text);
            setPhase(text ? 'result' : 'idle');
            if (!text) setError('No speech detected. Please try again.');
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setPhase('idle');
        }
    };

    const handleMicTap = () => {
        if (phase === 'idle') {
            void handleRecord();
        } else if (phase === 'recording') {
            void stop();
        }
    };

    return (
        <motion.div
            key="voice"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col items-center justify-center gap-6"
        >
            <button
                onClick={handleMicTap}
                disabled={phase === 'result'}
                className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center relative transition-all duration-300",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    phase === 'recording' ? "bg-red-500/10" : "bg-accent/10 hover:bg-accent/20"
                )}
            >
                {phase === 'recording' && (
                    <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 rounded-full bg-red-500/20"
                    />
                )}
                {phase === 'recording'
                    ? <Square className="w-10 h-10 text-red-500" />
                    : <Mic className={cn("w-10 h-10 transition-colors", "text-accent")} />
                }
            </button>

            <div className="text-center space-y-4 max-w-xs">
                {phase === 'recording' ? (
                    <div className="space-y-2">
                        <p className="text-xl font-medium animate-pulse">Listening...</p>
                        <p className="text-sm text-muted-foreground">Say "Grocery $50" or "Taxi $15"</p>
                    </div>
                ) : phase === 'result' && transcript ? (
                    <div className="space-y-2">
                        <div className="bg-muted p-3 rounded-xl border border-border">
                            <p className="text-sm mb-1 text-muted-foreground">Recognized:</p>
                            <p className="text-lg font-bold">
                                {parsed.merchant || "Unknown"} • ${parsed.amount || "0.00"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">Tap to Speak</h3>
                        <p className="text-muted-foreground text-sm">Tap the mic and say your expense.</p>
                    </div>
                )}

                {error && <p className="text-red-500 text-xs">{error}</p>}

                {phase === 'result' && transcript && (
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => { setTranscript(''); setError(null); setPhase('idle'); }}
                        >
                            Retry
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => onCommand(parsed)}
                        >
                            Use This <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
