import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Sparkles, Image, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/hooks/useCurrency';
import { useUserBehavior } from '@/hooks/useUserBehavior';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { compressForGemini } from '@/lib/imageProcessor';
import { callGeminiVision } from '@/lib/geminiVision';

export interface ScannedReceiptData {
    merchant?: string;
    amount?: number;
    subtotal?: number;
    tax?: number;
    tip?: number;
    date?: Date;
    receiptUrl?: string;
    receiptPath?: string;
    rawText?: string;
    currency?: string;
    provider?: string; // 'mindee-v2' | 'gemini-vision' | 'tesseract'
}

interface ReceiptScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanComplete: (data: ScannedReceiptData) => void;
}

export function ReceiptScannerModal({ open, onOpenChange, onScanComplete }: ReceiptScannerModalProps) {
    const { privacyMode } = useProfile();
    const { ensurePermission } = usePermissions();
    const { currency: userCurrency } = useCurrency();
    const { logEvent } = useUserBehavior();
    const { toast } = useToast();
    const [scanning, setScanning] = useState(false);
    const [scanLabel, setScanLabel] = useState('Analyzing receipt...');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<ScannedReceiptData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!open) {
            setPreviewImage(null);
            setExtractedData(null);
            setScanning(false);
            setScanLabel('Analyzing receipt...');
        }
    }, [open]);

    const isNative = Capacitor.isNativePlatform();

    const handleTakePhoto = async () => {
        if (isNative) {
            const hasPermission = await ensurePermission('camera');
            if (!hasPermission) {
                toast({
                    variant: 'destructive',
                    title: 'Camera Permission Required',
                    description: 'Please enable Camera access in device settings.'
                });
                return;
            }
        }

        fileInputRef.current?.click();
    };

    const handleChooseFromGallery = async () => {
        if (isNative) {
            const hasPermission = await ensurePermission('photos');
            if (!hasPermission) {
                toast({
                    variant: 'destructive',
                    title: 'Photos Permission Required',
                    description: 'Please enable Photos access in device settings.'
                });
                return;
            }
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                await processImage(file);
            }
        };

        input.click();
    };

    const processImage = async (file: File) => {
        setScanning(true);
        setScanLabel('Analyzing receipt...');

        try {
            const dataUrl = await fileToDataURL(file);
            setPreviewImage(dataUrl);

            setScanLabel('Extracting with AI...');
            const { base64, mimeType } = await compressForGemini(file);
            const result = await callGeminiVision(base64, mimeType, userCurrency);

            setExtractedData({
                merchant: result.merchant,
                amount: result.amount,
                date: result.date ? new Date(result.date) : undefined,
                currency: result.currency,
                receiptUrl: dataUrl,
                receiptPath: file.name,
                provider: 'gemini-vision',
            });
            logReceiptScan(result.confidence, 'unknown', userCurrency, false, false);

        } catch (err) {
            console.error('[ReceiptScanner] Extraction failed:', err);
            toast({
                variant: 'destructive',
                title: 'Scan Failed',
                description: 'Could not read receipt. Please try again or enter details manually.',
            });
        } finally {
            setScanning(false);
            setScanLabel('Analyzing receipt...');
        }
    };

    const logReceiptScan = async (
        confidence: string,
        scriptType: string,
        currency: string,
        wasCorrected: boolean,
        hadTaxLine: boolean
    ) => {
        try {
            await logEvent('receipt_scanned', {
                confidence,
                script_type: scriptType,
                currency,
                was_corrected: wasCorrected,
                had_tax_line: hadTaxLine,
            });
        } catch (err) {
            console.error('[ReceiptScanner] Failed to log behavior event:', err);
        }
    };

    const handleConfirm = () => {
        if (extractedData) {
            onScanComplete(extractedData);
        }
    };

    const handleRetake = () => {
        setPreviewImage(null);
        setExtractedData(null);
    };

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

                    {/* Hidden file input for camera */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await processImage(file);
                            e.target.value = '';
                        }}
                    />

                    {/* Scanner Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-x-4 bottom-24 md:bottom-28 z-[61] max-w-lg mx-auto"
                    >
                        <div className="bg-card/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden card-3d">

                            {/* Header */}
                            <div className="flex items-center justify-between p-2 bg-muted/40 border-b border-white/5">
                                <h3 className="text-sm font-bold px-3">Scan Receipt</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onOpenChange(false)}
                                    className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Content Area */}
                            <div className="p-4 min-h-[350px] flex flex-col relative">
                                <AnimatePresence mode="wait">
                                    {!previewImage && !scanning && (
                                        <motion.div
                                            key="options"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex-1 flex flex-col items-center justify-center gap-4"
                                        >
                                            <div className="text-center space-y-2 mb-4">
                                                <h4 className="text-lg font-bold">Capture Receipt</h4>
                                                <p className="text-muted-foreground text-sm">Auto-extract details from your receipt</p>
                                            </div>

                                            <div className="w-full space-y-3">
                                                <Button
                                                    onClick={handleTakePhoto}
                                                    className="w-full h-14 rounded-2xl text-base font-bold gap-3"
                                                >
                                                    <Camera className="w-5 h-5" />
                                                    Take Photo
                                                </Button>

                                                <Button
                                                    onClick={handleChooseFromGallery}
                                                    variant="outline"
                                                    className="w-full h-14 rounded-2xl text-base font-bold gap-3"
                                                >
                                                    <Image className="w-5 h-5" />
                                                    Choose from Gallery
                                                </Button>
                                            </div>

                                            <p className="text-xs text-muted-foreground text-center mt-4">
                                                We'll automatically extract merchant, amount, and date
                                            </p>
                                        </motion.div>
                                    )}

                                    {scanning && (
                                        <motion.div
                                            key="scanning"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex-1 flex flex-col items-center justify-center gap-4"
                                        >
                                            <Loader2 className="w-12 h-12 animate-spin text-accent" />
                                            <div className="text-center space-y-2">
                                                <h4 className="text-lg font-bold">Analyzing Receipt...</h4>
                                                <p className="text-muted-foreground text-sm">{scanLabel}</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {previewImage && !scanning && (
                                        <motion.div
                                            key="preview"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex-1 flex flex-col gap-4"
                                        >
                                            {/* Image Preview */}
                                            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/50">
                                                <img
                                                    src={previewImage}
                                                    alt="Receipt preview"
                                                    className="w-full h-48 object-cover"
                                                />
                                                {extractedData && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-3">
                                                        <div className="flex items-center gap-2 text-white text-xs">
                                                            <Check className="w-4 h-4 text-emerald-400" />
                                                            <span className="font-bold">
                                                                {extractedData.merchant || 'Merchant not detected'}
                                                            </span>
                                                            {extractedData.amount && (
                                                                <span className="text-emerald-400 ml-auto font-mono">
                                                                    {extractedData.currency || '$'}{extractedData.amount.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Extracted Data Summary */}
                                            {extractedData && (
                                                <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Extracted Details</h5>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                            AI Vision
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground">Merchant</p>
                                                            <p className="text-sm font-bold">{extractedData.merchant || '—'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground">Amount</p>
                                                            <p className="text-sm font-bold text-emerald-500">
                                                                {extractedData.amount
                                                                    ? `${extractedData.currency || '$'}${extractedData.amount.toFixed(2)}`
                                                                    : '—'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground">Date</p>
                                                            <p className="text-sm font-bold">
                                                                {extractedData.date ? extractedData.date.toLocaleDateString() : '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Old receipt warning */}
                                            {extractedData?.date && (new Date().getTime() - extractedData.date.getTime()) > 365 * 24 * 60 * 60 * 1000 && (
                                                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                                                        <span className="font-bold">Old receipt detected.</span> The date on this bill is over a year ago. If you're adding it now, edit the date to today in the next step.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-3 pt-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={handleRetake}
                                                    className="flex-1 rounded-xl"
                                                >
                                                    Retake
                                                </Button>
                                                <Button
                                                    onClick={handleConfirm}
                                                    disabled={!extractedData}
                                                    className="flex-1 rounded-xl"
                                                >
                                                    Continue
                                                </Button>
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

function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
    });
}
