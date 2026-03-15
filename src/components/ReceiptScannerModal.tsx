import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Sparkles, Image, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PrivacyMask } from '@/components/ui/privacy-mask';
import { useProfile } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { Capacitor } from '@capacitor/core';
import { preprocessImage } from '@/lib/imageProcessor';
import { createWorker } from 'tesseract.js';
import { useToast } from '@/hooks/use-toast';

export interface ScannedReceiptData {
    merchant?: string;
    amount?: number;
    date?: Date;
    receiptUrl?: string;
    receiptPath?: string;
    rawText?: string;
}

interface ReceiptScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScanComplete: (data: ScannedReceiptData) => void;
}

export function ReceiptScannerModal({ open, onOpenChange, onScanComplete }: ReceiptScannerModalProps) {
    const { privacyMode } = useProfile();
    const { ensurePermission } = usePermissions();
    const { toast } = useToast();
    const [scanning, setScanning] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<ScannedReceiptData | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!open) {
            setPreviewImage(null);
            setExtractedData(null);
            setScanning(false);
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

        // Use file input for camera capture (works on both web and native via Capacitor)
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Use rear camera
        
        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                const dataUrl = await fileToDataURL(file);
                setPreviewImage(dataUrl);
                await processImage(dataUrl, file.name);
            }
        };
        
        input.click();
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

        // Use file input for gallery selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                const dataUrl = await fileToDataURL(file);
                setPreviewImage(dataUrl);
                await processImage(dataUrl, file.name);
            }
        };
        
        input.click();
    };

    const fileToDataURL = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    };

    const blobToDataURL = (blob: Blob): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    };

    const processImage = async (imageData: string, imagePath: string) => {
        setScanning(true);
        try {
            // Preprocess image for better OCR accuracy
            const blob = await (await fetch(imageData)).blob();
            const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
            const processedImage = await preprocessImage(file);

            // Run OCR
            const worker = await createWorker('eng', 1, {
                workerPath: '/worker.min.js',
                corePath: '/tesseract-core.wasm.js',
            });

            const ret = await worker.recognize(processedImage);
            const text = ret.data.text;
            await worker.terminate();

            console.log("Receipt OCR:", text);

            // Parse receipt data
            const parsedData = processReceiptText(text);
            
            setExtractedData({
                ...parsedData,
                receiptUrl: imageData,
                receiptPath: imagePath,
                rawText: text,
            });
        } catch (err) {
            console.error("OCR Failed:", err);
            toast({
                variant: 'destructive',
                title: 'OCR Error',
                description: 'Failed to extract text from image.'
            });
        } finally {
            setScanning(false);
        }
    };

    const processReceiptText = (text: string): { merchant?: string; amount?: number; date?: Date } => {
        const lines = text.split('\n');
        let amount = '';
        let date: Date | undefined;
        let merchant = '';

        // 1. Extract Amount (Look for highest number formatted as price)
        const priceRegex = /(\$|€|£|¥)?\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;
        let maxVal = 0;
        const amountMatches = [...text.matchAll(priceRegex)];

        for (const match of amountMatches) {
            const valStr = match[2].replace(',', '.');
            const val = parseFloat(valStr);
            if (!isNaN(val) && val > maxVal && val < 500000) {
                maxVal = val;
            }
        }
        if (maxVal > 0) amount = maxVal.toFixed(2);

        // 2. Extract Date
        const dateRegex = /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/;
        const dateMatch = text.match(dateRegex);
        if (dateMatch) {
            const dateStr = dateMatch[1];
            const timestamp = Date.parse(dateStr);
            if (!isNaN(timestamp)) {
                date = new Date(timestamp);
            }
        }

        // 3. Extract Merchant (First meaningful line)
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 3 && !trimmed.match(/^\d/) && !trimmed.includes('Welcome') && !trimmed.includes('RECEIPT')) {
                if (trimmed === trimmed.toUpperCase()) {
                    merchant = trimmed;
                    break;
                }
                if (!merchant) merchant = trimmed;
            }
        }

        console.log("Extracted:", { amount, date, merchant });
        return {
            merchant,
            amount: amount ? parseFloat(amount) : undefined,
            date,
        };
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
                                                <h4 className="text-lg font-bold">Scanning Receipt...</h4>
                                                <p className="text-muted-foreground text-sm">Extracting merchant, amount & date</p>
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
                                                                    ${extractedData.amount.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Extracted Data Summary */}
                                            {extractedData && (
                                                <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
                                                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Extracted Details</h5>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground">Merchant</p>
                                                            <p className="text-sm font-bold">{extractedData.merchant || '—'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground">Amount</p>
                                                            <p className="text-sm font-bold text-emerald-500">
                                                                {extractedData.amount ? `$${extractedData.amount.toFixed(2)}` : '—'}
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