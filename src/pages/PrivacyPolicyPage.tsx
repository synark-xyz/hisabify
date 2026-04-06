import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { PrivacyContent } from '@/lib/legalContent';

export function PrivacyPolicyPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background pb-page-content">
            <Header title={t('page.privacyPolicy')} showBack onBack={() => navigate(user ? '/settings' : '/auth')} />
            <main className="px-4 py-6">
                <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                    <PrivacyContent />
                </ScrollArea>
            </main>
        </div>
    );
}
