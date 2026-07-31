// src/components/DeletionRequestSheet.tsx
import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DELETION_REASONS, DeletionReason, DeletionScope } from '@/hooks/useDeletionRequest';

interface DeletionRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: DeletionScope;
  submitting: boolean;
  onConfirm: (reason: DeletionReason | null, detail: string) => Promise<boolean>;
}

export function DeletionRequestSheet({
  open,
  onOpenChange,
  scope,
  submitting,
  onConfirm,
}: DeletionRequestSheetProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<DeletionReason | null>(null);
  const [detail, setDetail] = useState('');

  const handleSubmit = async () => {
    const ok = await onConfirm(reason, detail);
    if (ok) {
      setReason(null);
      setDetail('');
      onOpenChange(false);
    }
  };

  return (
    <BaseModalSheet open={open} onOpenChange={onOpenChange} snapPoints={[0.85]}>
      <SheetBackdrop onClick={() => onOpenChange(false)} />
      <SheetContainer>
        <SheetHeader>
          <SheetTitle>
            {scope === 'account' ? t('deletionRequest.sheetTitleAccount') : t('deletionRequest.sheetTitleData')}
          </SheetTitle>
          <SheetClose />
        </SheetHeader>

        <SheetContent>
          <div className="px-4 py-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              {scope === 'account' ? t('deletionRequest.explainAccount') : t('deletionRequest.explainData')}
            </p>

            <div className="space-y-2">
              <Label>{t('deletionRequest.reasonLabel')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {DELETION_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(reason === r ? null : r)}
                    aria-pressed={reason === r}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors text-left',
                      reason === r
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border/60 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {t(`deletionRequest.reason_${r}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deletion-detail">{t('deletionRequest.detailLabel')}</Label>
              <Textarea
                id="deletion-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={t('deletionRequest.detailPlaceholder')}
                className="min-h-24"
                maxLength={2000}
              />
            </div>
          </div>
        </SheetContent>

        <SheetFooter>
          <Button
            className="w-full bg-destructive hover:bg-destructive/90"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? t('deletionRequest.submitting') : t('deletionRequest.submit')}
          </Button>
        </SheetFooter>
      </SheetContainer>
    </BaseModalSheet>
  );
}
