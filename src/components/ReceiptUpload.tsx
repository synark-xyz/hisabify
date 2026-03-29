import { useRef, useState } from 'react';
import { X, FileImage, Loader2, Eye, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useReceiptUpload } from '@/hooks/useReceiptUpload';
import { usePermissions } from '@/hooks/usePermissions';
import { useCurrency } from '@/hooks/useCurrency';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { compressForGemini } from '@/lib/imageProcessor';
import { callGeminiVision } from '@/lib/geminiVision';
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
  const { currency: userCurrency } = useCurrency();
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [scanning, setScanning] = useState(false);
  const [scanLabel, setScanLabel] = useState('Scanning Receipt...');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // 1. OCR Scan via Gemini Vision
    if (onScanComplete && file.type.startsWith('image/')) {
      setScanning(true);
      setScanLabel('Scanning with AI...');
      try {
        const { base64, mimeType } = await compressForGemini(file);
        const result = await callGeminiVision(base64, mimeType, userCurrency);

        if (result.merchant || result.amount) {
          onScanComplete({
            amount: result.amount != null ? String(Number(result.amount).toFixed(2)) : undefined,
            date: result.date ? new Date(result.date) : undefined,
            merchant: result.merchant,
          });
          if (import.meta.env.DEV) {
            toast({
              title: '[DEBUG] Gemini Vision',
              description: `merchant=${result.merchant ?? '—'} amount=${result.amount ?? '—'} conf=${result.confidence}`,
            });
          }
        }
      } catch (err) {
        console.error('[ReceiptUpload] OCR Failed:', err);
        // Form stays blank — user fills in manually
      } finally {
        setScanning(false);
        setScanLabel('Scanning Receipt...');
      }
    }

    // 2. Upload File (Skip if transient)
    if (!transient) {
      const result = await uploadReceipt(file);
      if (result) {
        setPreviewUrl(result.url);
        onChange(result.url, result.path);
      } else {
        if (!value) setPreviewUrl(null);
      }
    } else {
      onChange(localPreview);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange(null);
  };

  const handleFilePickerClick = async () => {
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
                <span className="text-xs font-bold uppercase tracking-wider">{scanLabel}</span>
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
                <span className="text-sm">{scanning ? scanLabel : `Uploading... ${progress}%`}</span>
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
