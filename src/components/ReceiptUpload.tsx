import { useRef, useState } from 'react';
import { Upload, X, FileImage, Loader2, Eye, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useReceiptUpload } from '@/hooks/useReceiptUpload';
import { usePermissions } from '@/hooks/usePermissions';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { createWorker } from 'tesseract.js';
import { format, parse } from 'date-fns';
import { preprocessImage } from '@/lib/imageProcessor';
import { useToast } from '@/hooks/use-toast';

interface ReceiptUploadProps {
  value?: string | null;
  onChange: (url: string | null, path?: string) => void;
  onScanComplete?: (data: { amount?: string, date?: Date, merchant?: string }) => void;
  disabled?: boolean;
  transient?: boolean;
}

export function ReceiptUpload({ value, onChange, onScanComplete, disabled, transient = false }: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadReceipt, uploading: uploadLoading, progress } = useReceiptUpload();
  const { ensurePermission, isNative } = usePermissions();
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [scanning, setScanning] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // 1. Start OCR Scan (if callback provided)
    if (onScanComplete && file.type.startsWith('image/')) {
      setScanning(true);
      try {
        // Preprocess image for better OCR accuracy
        console.log("Preprocessing image...");
        const processedImage = await preprocessImage(file);

        const worker = await createWorker('eng', 1, {
          workerPath: '/worker.min.js',
          corePath: '/tesseract-core.wasm.js',
        });

        const ret = await worker.recognize(processedImage);
        const text = ret.data.text;
        await worker.terminate();

        console.log("Receipt OCR:", text);
        processReceiptText(text);

      } catch (err) {
        console.error("OCR Failed:", err);
      } finally {
        setScanning(false);
      }
    }

    // 2. Upload File (Skip if transient)
    if (!transient) {
      const result = await uploadReceipt(file);
      if (result) {
        setPreviewUrl(result.url);
        onChange(result.url, result.path);
      } else {
        // If upload fails but we have a local preview, maybe keep it?
        // For now, if upload fails, we revert to initial value
        if (!value) setPreviewUrl(null);
      }
    } else {
      // In transient mode, we just keep the local preview for now
      // It won't be persisted to DB
      onChange(localPreview);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processReceiptText = (text: string) => {
    const lines = text.split('\n');
    let amount = '';
    let date: Date | undefined;
    let merchant = '';

    // 1. Extract Amount (Look for highest number formatted as price)
    // Matches: 12.34, 1,234.56, $12.34
    const priceRegex = /(\$|€|£|¥)?\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;
    let maxVal = 0;
    const amountMatches = [...text.matchAll(priceRegex)];

    for (const match of amountMatches) {
      const valStr = match[2].replace(',', '.'); // Simplify
      const val = parseFloat(valStr);
      // Simple heuristic: Total is usually the largest number, but distinct from e.g. a phone number
      if (!isNaN(val) && val > maxVal && val < 500000) {
        maxVal = val;
      }
    }
    if (maxVal > 0) amount = maxVal.toFixed(2);

    // 2. Extract Date
    // Matches: MM/DD/YYYY, YYYY-MM-DD, DD.MM.YYYY, etc.
    const dateRegex = /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      // Try parsing common formats
      const timestamp = Date.parse(dateStr);
      if (!isNaN(timestamp)) {
        date = new Date(timestamp);
      }
    }

    // 3. Extract Merchant (First meaningful line)
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 3 && !trimmed.match(/^\d/) && !trimmed.includes('Welcome') && !trimmed.includes('RECEIPT')) {
        if (trimmed === trimmed.toUpperCase()) { // Heuristic: Merchants often use ALL CAPS
          merchant = trimmed;
          break;
        }
        // Fallback to first non-empty line
        if (!merchant) merchant = trimmed;
      }
    }

    console.log("Extracted:", { amount, date, merchant });
    if (onScanComplete) {
      onScanComplete({ amount, date, merchant });
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange(null);
  };

  const handleFilePickerClick = async () => {
    // On native platforms, request camera/photos permission before opening picker
    if (isNative) {
      const hasCameraPermission = await ensurePermission('camera');
      const hasPhotosPermission = await ensurePermission('photos');

      if (!hasCameraPermission && !hasPhotosPermission) {
        toast({
          variant: 'destructive',
          title: 'Permission Required',
          description: 'Please enable Camera or Photo Library access in device settings.'
        });
        return;
      }
    }

    // Trigger file input
    fileInputRef.current?.click();
  };

  const isPdf = previewUrl?.includes('.pdf') || previewUrl?.includes('application/pdf');
  const isLoading = uploadLoading || scanning;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isLoading}
      />

      <AnimatePresence mode="wait">
        {previewUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden border border-border bg-muted/50"
          >
            {scanning && (
              <div className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                <ScanLine className="w-8 h-8 animate-pulse text-white mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Scanning Receipt...</span>
              </div>
            )}

            {isPdf ? (
              <div className="flex items-center justify-center h-32 bg-muted">
                <FileImage className="w-12 h-12 text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">PDF Receipt</span>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full h-32 object-cover"
              />
            )}

            <div className="absolute top-2 right-2 flex gap-1 z-20">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 rounded-full"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[600px]">
                  {isPdf ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-[70vh]"
                      title="Receipt PDF"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Receipt"
                      className="w-full h-auto max-h-[70vh] object-contain"
                    />
                  )}
                </DialogContent>
              </Dialog>

              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-7 w-7 rounded-full"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="upload"
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleFilePickerClick}
            disabled={disabled || isLoading}
            className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                {scanning ? <ScanLine className="w-8 h-8 animate-pulse text-accent" /> : <Loader2 className="w-8 h-8 animate-spin text-accent" />}
                <span className="text-sm">{scanning ? 'Extracting Data...' : `Uploading... ${progress}%`}</span>
              </>
            ) : (
              <>
                <div className="p-3 bg-muted rounded-full group-hover:scale-110 transition-transform">
                  <ScanLine className="w-6 h-6 text-foreground" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-foreground block">Scan Receipt</span>
                  <span className="text-xs">Auto-extract details from image</span>
                </div>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
