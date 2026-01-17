import { useRef, useState } from 'react';
import { Upload, X, FileImage, Loader2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useReceiptUpload } from '@/hooks/useReceiptUpload';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface ReceiptUploadProps {
  value?: string | null;
  onChange: (url: string | null, path?: string) => void;
  disabled?: boolean;
}

export function ReceiptUpload({ value, onChange, disabled }: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadReceipt, uploading, progress } = useReceiptUpload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create local preview
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const result = await uploadReceipt(file);
    if (result) {
      setPreviewUrl(result.url);
      onChange(result.url, result.path);
    } else {
      setPreviewUrl(value || null);
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

  const isPdf = previewUrl?.includes('.pdf') || previewUrl?.includes('application/pdf');

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
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
            
            <div className="absolute top-2 right-2 flex gap-1">
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
                <DialogContent className="max-w-3xl">
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
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
                <span className="text-sm">Uploading... {progress}%</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8" />
                <span className="text-sm">Upload receipt (optional)</span>
                <span className="text-xs">JPEG, PNG, WebP, or PDF • Max 5MB</span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
