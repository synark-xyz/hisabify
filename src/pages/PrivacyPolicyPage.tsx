import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export function PrivacyPolicyPage() {
    const { user } = useAuth();
    const { profile, setProfile } = useProfile();
    const { toast } = useToast();
    const [accepted, setAccepted] = useState(profile.privacy_policy_accepted);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setAccepted(profile.privacy_policy_accepted);
    }, [profile.privacy_policy_accepted]);

    const handleAgreementChange = async (checked: boolean) => {
        if (!user) return;
        const previous = accepted;
        setAccepted(checked);
        setSaving(true);

        const { error } = await supabase
            .from('users')
            .update({ privacy_policy_accepted: checked })
            .eq('user_id', user.id);

        if (error) {
            setAccepted(previous);
            toast({ title: 'Could not update agreement', description: error.message, variant: 'destructive' });
        } else {
            setProfile({ ...profile, privacy_policy_accepted: checked });
            toast({ title: checked ? 'Privacy policy accepted' : 'Privacy policy agreement removed' });
        }

        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-background pb-page-content">
            <Header title="Privacy Policy" showBack />
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
                                If you have any questions about this policy, please contact us at support@hisabify.com.
                            </p>
                        </section>

                        <div className="pt-8 text-center text-xs text-muted-foreground">
                            Last updated: January 2026
                        </div>

                        <section className="rounded-xl border border-border/60 bg-card p-4">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="privacy-policy-agreement"
                                    checked={accepted}
                                    onCheckedChange={(value) => handleAgreementChange(Boolean(value))}
                                    disabled={saving}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="privacy-policy-agreement" className="font-semibold text-foreground">
                                        I have read and agree to the Privacy Policy
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Your agreement is saved to your account and can be changed later.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
