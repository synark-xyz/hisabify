import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';

export function PrivacyPolicyPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background pb-page-content">
            <Header title="Privacy Policy" showBack onBack={() => navigate(user ? '/settings' : '/auth')} />
            <main className="px-4 py-6">
                <ScrollArea className="h-[calc(100vh-140px)] pr-4">
                    <div className="space-y-6 text-foreground/80">
                        <section>
                            <h2 className="text-lg font-bold text-foreground mb-2">1. Introduction</h2>
                            <p className="text-sm leading-relaxed">
                                Welcome to Hisabify. We are committed to protecting your privacy and ensuring your financial data remains secure.
                                This policy outlines how we collect, use, and protect your information.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-foreground mb-2">2. Data Collection</h2>
                            <p className="text-sm leading-relaxed">
                                We collect only the data necessary to provide our services, including:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                                <li>Account information (email, name)</li>
                                <li>Financial data (transactions, budgets, savings goals)</li>
                                <li>Usage statistics to improve app performance</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-foreground mb-2">3. Data Security</h2>
                            <p className="text-sm leading-relaxed">
                                Your data is encrypted both in transit and at rest. We do not sell your personal data to third parties.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-foreground mb-2">4. User Rights</h2>
                            <p className="text-sm leading-relaxed">
                                You have the right to access, export, and delete your data at any time through the Data Management section of the app.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-lg font-bold text-foreground mb-2">5. Contact Us</h2>
                            <p className="text-sm leading-relaxed">
                                If you have any questions about this policy, please contact us at synarklabs@gmail.com.
                            </p>
                        </section>

                        <div className="pt-8 text-center text-xs text-muted-foreground">
                            Last updated: January 2026
                        </div>
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
