import { useTranslation } from 'react-i18next';
import { LegalDocPage } from '@/components/LegalDocPage';
import { SubscriptionTermsContent } from '@/components/SubscriptionTermsContent';
import { TermsContent } from '@/lib/legalContent';

/**
 * Terms & Conditions (/terms) — Terms of Service plus Subscription & Billing
 * on one scrollable page.
 *
 * The group headings are load-bearing: each document restarts its own section
 * numbering at 1 (ToS runs 1–12, Subscription runs 1–11), so without them the
 * page reads as one document that counts to twelve and starts over.
 *
 * They are hardcoded English on purpose — the entire body of both documents is
 * untranslated English. Only the page title goes through i18n, matching /privacy.
 */
export function TermsPage() {
  const { t } = useTranslation();

  return (
    <LegalDocPage title={t('page.termsConditions')}>
      <h2 className="text-base font-black text-foreground">Terms of Service</h2>
      <TermsContent />

      <h2 className="text-base font-black text-foreground pt-2 border-t border-border/50">
        Subscription &amp; Billing
      </h2>
      <SubscriptionTermsContent />
    </LegalDocPage>
  );
}
