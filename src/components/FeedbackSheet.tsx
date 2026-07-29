import { ChangeEvent, useEffect, useState } from 'react';
import { Paperclip, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  BaseModalSheet,
  SheetBackdrop,
  SheetContainer,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
} from '@/components/ui/base-modal-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  FEEDBACK_TYPES,
  FeedbackType,
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE_BYTES,
  useAppFeedback,
} from '@/hooks/useAppFeedback';
import { cn } from '@/lib/utils';

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

interface FeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackSheet({ open, onOpenChange }: FeedbackSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { submitFeedback, submitting } = useAppFeedback();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [otherLabel, setOtherLabel] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setFeedbackType('bug');
    setOtherLabel('');
    setMessage('');
    setFiles([]);
  }, [open]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;

    const next = [...files];
    for (const file of selected) {
      if (next.length >= MAX_ATTACHMENTS) {
        toast({ title: t('feedback.maxFiles', { count: MAX_ATTACHMENTS }), variant: 'destructive' });
        break;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: t('feedback.fileTooLarge', { filename: file.name }),
          description: t('feedback.maxFileSize'),
          variant: 'destructive',
        });
        continue;
      }
      next.push(file);
    }
    setFiles(next);
  };

  const removeFile = (index: number) => setFiles((cur) => cur.filter((_, i) => i !== index));

  const canSubmit =
    message.trim().length > 0 &&
    (feedbackType !== 'other' || otherLabel.trim().length > 0) &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({ title: t('feedback.completeFields'), variant: 'destructive' });
      return;
    }

    const ok = await submitFeedback({ feedbackType, otherLabel, message, files });
    if (!ok) {
      toast({ title: t('feedback.submitFailed'), variant: 'destructive' });
      return;
    }

    toast({ title: t('feedback.sent'), description: t('feedback.sentDescription') });
    onOpenChange(false);
  };

  return (
    // Opens full-height; drag the header to shrink to half.
    <BaseModalSheet open={open} onOpenChange={onOpenChange} snapPoints={[1, 0.5]}>
      <SheetBackdrop onClick={() => onOpenChange(false)} />
      <SheetContainer className="z-[10001]">
        <SheetHeader>
          <SheetTitle>{t('feedback.title')}</SheetTitle>
          <SheetClose />
        </SheetHeader>

        <SheetContent>
          <div className="px-4 py-4 space-y-5">
            {/* Email — auto-filled from the session, shown read-only so the user knows
                which address the team will reply to. */}
            <div className="space-y-2">
              <Label htmlFor="feedback-email">{t('feedback.email')}</Label>
              <Input
                id="feedback-email"
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('feedback.type')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {FEEDBACK_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type)}
                    aria-pressed={feedbackType === type}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors text-left',
                      feedbackType === type
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border/60 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {t(`feedback.type_${type}`)}
                  </button>
                ))}
              </div>
            </div>

            {feedbackType === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="feedback-other">{t('feedback.otherLabel')}</Label>
                <Input
                  id="feedback-other"
                  value={otherLabel}
                  onChange={(e) => setOtherLabel(e.target.value)}
                  placeholder={t('feedback.otherPlaceholder')}
                  maxLength={80}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="feedback-message">{t('feedback.description')}</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('feedback.descriptionPlaceholder')}
                className="min-h-32"
                maxLength={4000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-files">{t('feedback.attachments')}</Label>
              <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
                <label
                  htmlFor="feedback-files"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  {t('feedback.addFiles')}
                </label>
                <input
                  id="feedback-files"
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.txt,.log"
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-muted-foreground">
                  {t('feedback.attachmentHelp', { count: MAX_ATTACHMENTS })}
                </p>

                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                      aria-label={t('feedback.removeFile', { filename: file.name })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>

        <SheetFooter>
          <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? t('feedback.sending') : t('feedback.submit')}
          </Button>
        </SheetFooter>
      </SheetContainer>
    </BaseModalSheet>
  );
}
