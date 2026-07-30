import { useTranslation } from 'react-i18next';
import { LegalDocPage } from '@/components/LegalDocPage';
import { PrivacyContent } from '@/lib/legalContent';

/**
 * Privacy Policy (/privacy).
 *
 * Stays a standalone route rather than folding into /terms: Play Console Data
 * Safety and App Store Connect both want a URL whose page *is* the privacy
 * policy.
 */
export function PrivacyPolicyPage() {
    const { t } = useTranslation();

    return (
        <LegalDocPage title={t('page.privacyPolicy')}>
            <PrivacyContent />
        </LegalDocPage>
    );
}
