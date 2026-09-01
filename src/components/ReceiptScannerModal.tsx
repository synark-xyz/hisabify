import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Image, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseModalSheet, SheetBackdrop, SheetContainer, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/base-modal-sheet';
import { useProfile } from '@/hooks/useProfile';
import { useCurrency } from '@/hooks/useCurrency';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useToast } from '@/hooks/use-toast';
import { compressForGemini } from '@/lib/imageProcessor';
import { callGeminiVision, GEMINI_KEY_MISSING } from '@/lib/geminiVision';
import { parseCurrencyFromString, normalizeCurrency } from '@/lib/currencyUtils';

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
    provider?: string;
}

interface ReceiptScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanComplete: (data: ScannedReceiptData) => void;
}

export function ReceiptScannerModal({ open, onOpenChange, onScanComplete }: ReceiptScannerModalProps) {
    const { privacyMode } = useProfile();
    const { currency: userCurrency } = useCurrency();
    const { logEvent } = useAnalytics();
    const { toast } = useToast();
    const [scanning, setScanning] = useState(false);
    const [scanLabel, setScanLabel] = useState('Analyzing receipt...');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<ScannedReceiptData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) {
            setPreviewImage(null);
            setExtractedData(null);
            setScanning(false);
            setScanLabel('Analyzing receipt...');
        }
    }, [open]);

    const handleTakePhoto = () => {
        // No permission gate. This input carries capture="environment", and Capacitor's
        // BridgeWebChromeClient requests CAMERA itself before launching the capture intent
        // (falling back to the file picker when it is refused). Gating here too meant
        // depending on @capacitor/camera, which is what pulled in com.google.android.material
        // — and its BottomSheetDialog is the deprecated Window.setStatusBarColor call Play
        // reports under Android 15. See usePermissions.ts.
        fileInputRef.current?.click();
    };

    const handleChooseFromGallery = async () => {
        // No permission gate: this file input IS the system photo picker. The WebView hands it
        // to a system picker that returns a per-URI read grant, so READ_MEDIA_IMAGES is neither
        // declared nor needed — and requesting it is what Google Play's photo and video
        // permissions policy flags. Do not add one back here.
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
        // Privacy Mode promised the user that images stay on-device. There is no on-device
        // OCR in this build, so the only honest options are "don't send it" or "lie". Refuse
        // the scan and point at manual entry rather than silently uploading to Gemini.
        if (privacyMode) {
            toast({
                variant: 'destructive',
                title: 'Privacy Mode is On',
                description: 'Receipt scanning sends the image to Google Gemini. Turn off Privacy Mode in Settings to scan, or enter the details manually.',
            });
            return;
        }

        setScanning(true);
        setScanLabel('Analyzing receipt...');

        try {
            const { base64, mimeType } = await compressForGemini(file);
            // Reuse the compressed copy for preview and for the stored receipt:
            // the raw camera file is 3-8MB, and receiptUrl ends up in
            // transactions.receipt_url verbatim.
            const dataUrl = `data:${mimeType};base64,${base64}`;
            setPreviewImage(dataUrl);

            setScanLabel('Extracting with AI...');
            const result = await callGeminiVision(base64, mimeType, userCurrency);

            const detectedCurrency = result.currency
                ? normalizeCurrency(result.currency, userCurrency)
                : userCurrency;
            
            setExtractedData({
                merchant: result.merchant,
                amount: result.amount,
                date: result.date ? new Date(result.date) : undefined,
                currency: detectedCurrency,
                receiptUrl: dataUrl,
                receiptPath: file.name,
                provider: 'gemini-vision',
            });
            logReceiptScan(result.confidence, 'unknown', userCurrency, false, false);

        } catch (err) {
            console.error('[ReceiptScanner] Extraction failed:', err);
            // Drop back to the capture screen. Leaving the preview up strands the user on a
            // dead end: Continue stays disabled because there is no extractedData.
            setPreviewImage(null);
            setExtractedData(null);
            const unconfigured = err instanceof Error && err.message === GEMINI_KEY_MISSING;
            toast({
                variant: 'destructive',
                title: unconfigured ? 'Receipt Scanning Unavailable' : 'Scan Failed',
                description: unconfigured
                    ? 'AI receipt scanning is not set up in this build. Please enter the details manually.'
                    : 'Could not read receipt. Please try again or enter details manually.',
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
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        await processImage(file);
                    }
                    e.target.value = '';
                }}
            />
            <BaseModalSheet open={open} onOpenChange={onOpenChange} snapPoints={[0.5, 0.2]}>
                <SheetBackdrop onClick={() => onOpenChange(false)} />
                <SheetContainer>
                    <SheetHeader>
                        <SheetTitle>Scan Receipt</SheetTitle>
                        <SheetClose />
                    </SheetHeader>
                    <SheetContent>
                        <div className="px-4 pb-4 pt-4">
                            <AnimatePresence mode="wait">
                                {!previewImage ? (
                                    <motion.div
                                        key="capture"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {/* Privacy mode notice */}
                                        {privacyMode && (
                                            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                                                <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                                                    Privacy Mode is ON — scanning is disabled because it would send this image to Google Gemini. Turn it off in Settings to scan.
                                                </p>
                                            </div>
                                        )}

                                        {/* Scanning indicator */}
                                        {scanning && (
                                            <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                                <div className="relative">
                                                    <Loader2 className="w-12 h-12 text-accent animate-spin" />
                                                    <Sparkles className="w-6 h-6 text-accent/50 absolute -top-1 -right-1 animate-pulse" />
                                                </div>
                                                <p className="text-sm text-muted-foreground animate-pulse">{scanLabel}</p>
                                            </div>
                                        )}

                                        {!scanning && (
                                            <>
                                                <div className="bg-gradient-to-br from-muted/50 to-muted/20 rounded-3xl border-2 border-dashed border-muted-foreground/20 p-8 text-center">
                                                    <div className="space-y-4">
                                                        <div className="w-16 h-16 mx-auto bg-accent/10 rounded-2xl flex items-center justify-center">
                                                            <Camera className="w-8 h-8 text-accent" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold">Take a photo or choose from gallery</p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                We'll extract merchant, amount, and date automatically
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-3">
                                                    <Button
                                                        variant="outline"
                                                        onClick={handleChooseFromGallery}
                                                        disabled={privacyMode}
                                                        className="flex-1 rounded-2xl"
                                                    >
                                                        <Image className="w-4 h-4 mr-2" />
                                                        Gallery
                                                    </Button>
                                                    <Button
                                                        onClick={handleTakePhoto}
                                                        disabled={privacyMode}
                                                        className="flex-1 rounded-2xl"
                                                    >
                                                        <Camera className="w-4 h-4 mr-2" />
                                                        Camera
                                                    </Button>
                                                </div>

                                                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                                                    Receipt images are sent to Google Gemini to read the merchant, amount and date.
                                                </p>
                                            </>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="preview"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {/* Scanning overlay */}
                                        {scanning && (
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
                                                <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
                                                <p className="text-sm text-white font-medium animate-pulse">{scanLabel}</p>
                                            </div>
                                        )}

                                        {/* Image preview */}
                                        <div className="relative rounded-2xl overflow-hidden bg-muted">
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

                                        {extractedData?.date && (new Date().getTime() - extractedData.date.getTime()) > 365 * 24 * 60 * 60 * 1000 && (
                                            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                                                    <span className="font-bold">Old receipt detected.</span> The date on this bill is over a year ago. If you're adding it now, edit the date to today in the next step.
                                                </p>
                                            </div>
                                        )}

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
                        </div>
                    </SheetContent>
                </SheetContainer>
            </BaseModalSheet>
        </>
    );
}

