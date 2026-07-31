import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, PartyPopper } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { useToast } from '@/hooks/use-toast';
import { openStoreListing } from '@/lib/appStore';
import { cn } from '@/lib/utils';

/** At or above this many stars we invite the user to post the review publicly. */
const STORE_REVIEW_THRESHOLD = 4;

interface RatingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a rating is successfully stored — stops future prompts. */
  onRated: () => void;
  /** "Don't ask again" — stops the daily prompt without a submission. */
  onDismissForever: () => void;
  /** Backdrop / close dismiss — re-eligible tomorrow. */
  onDismissForNow: () => void;
}

export function RatingSheet({
  open,
  onOpenChange,
  onRated,
  onDismissForever,
  onDismissForNow,
}: RatingSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { submitRating, submitting } = useAppFeedback();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Reset between openings so a reopened sheet never shows the previous answer.
  useEffect(() => {
    if (!open) return;
    setRating(0);
    setComment('');
    setSubmitted(false);
  }, [open]);

  const handleSubmit = async () => {
    if (rating === 0) return;

    const ok = await submitRating({ rating, comment });
    if (!ok) {
      toast({ title: t('rating.submitFailed'), variant: 'destructive' });
      return;
    }

    onRated();
    setSubmitted(true);
  };

  const handleClose = (next: boolean) => {
    if (!next && !submitted) onDismissForNow();
    onOpenChange(next);
  };

  return (
    <BaseModalSheet open={open} onOpenChange={handleClose} snapPoints={[0.7]}>
      <SheetBackdrop onClick={() => handleClose(false)} />
      <SheetContainer className="z-[10001]">
        <SheetHeader>
          <SheetTitle>{submitted ? t('rating.thanksTitle') : t('rating.title')}</SheetTitle>
          <SheetClose />
        </SheetHeader>

        <SheetContent>
          {submitted ? (
            <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center"
              >
                <PartyPopper className="w-8 h-8" />
              </motion.div>
              <p className="text-muted-foreground">
                {rating >= STORE_REVIEW_THRESHOLD
                  ? t('rating.thanksHighMessage')
                  : t('rating.thanksLowMessage')}
              </p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-5">
              <p className="text-sm text-muted-foreground text-center">{t('rating.subtitle')}</p>

              <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label={t('rating.title')}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={t('rating.starLabel', { count: star })}
                    onClick={() => setRating(star)}
                    whileTap={{ scale: 0.85 }}
                    className="p-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={cn(
                        'w-9 h-9 transition-colors',
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      )}
                    />
                  </motion.button>
                ))}
              </div>

              <div className="space-y-2">
                <label htmlFor="rating-comment" className="text-sm font-medium">
                  {t('rating.commentLabel')}
                </label>
                <Textarea
                  id="rating-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('rating.commentPlaceholder')}
                  className="min-h-24"
                  maxLength={1000}
                />
              </div>
            </div>
          )}
        </SheetContent>

        <SheetFooter className="space-y-2">
          {submitted ? (
            <>
              {rating >= STORE_REVIEW_THRESHOLD && (
                <Button
                  className="w-full"
                  onClick={() => {
                    void openStoreListing();
                    onOpenChange(false);
                  }}
                >
                  {t('rating.rateOnPlayStore')}
                </Button>
              )}
              <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                {t('rating.close')}
              </Button>
            </>
          ) : (
            <>
              <Button
                className="w-full"
                disabled={rating === 0 || submitting}
                onClick={handleSubmit}
              >
                {submitting ? t('rating.submitting') : t('rating.submit')}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={onDismissForever}
              >
                {t('rating.dontAskAgain')}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContainer>
    </BaseModalSheet>
  );
}
