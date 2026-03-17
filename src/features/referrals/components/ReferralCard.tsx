import React, { useState } from 'react';
import { Share2, Copy, Check, Gift, Ticket } from 'lucide-react';
import { useReferral } from '../hooks/useReferral';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type TabMode = 'share' | 'redeem';

export function ReferralCard() {
    const { referralCode, daysRemaining, hasUsedReferral, friendsInvited, redeemCode, loading, profileLoading } = useReferral();
    const codeLoading = profileLoading && !referralCode;
    const [activeTab, setActiveTab] = useState<TabMode>('share');
    const [redeemInput, setRedeemInput] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (referralCode) {
            const deepLink = `https://hisabify.app/auth?ref=${referralCode}`;
            navigator.clipboard.writeText(deepLink).catch(() => {
                navigator.clipboard.writeText(referralCode);
            });
            setCopied(true);
            toast.success('Invite link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = async () => {
        if (!referralCode) return;
        const deepLink = `https://hisabify.app/auth?ref=${referralCode}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join me on Hisabify!',
                    text: `Use my referral code ${referralCode} to get 30 days of Pro features for free!`,
                    url: deepLink,
                });
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    try {
                        await navigator.clipboard.writeText(deepLink);
                        setCopied(true);
                        toast.success('Invite link copied to clipboard');
                        setTimeout(() => setCopied(false), 2000);
                    } catch {
                        toast.error('Could not copy invite link');
                    }
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(deepLink);
                setCopied(true);
                toast.success('Invite link copied to clipboard');
                setTimeout(() => setCopied(false), 2000);
            } catch {
                toast.error('Could not copy invite link');
            }
        }
    };

    const handleRedeem = async () => {
        if (!redeemInput.trim()) return;
        const success = await redeemCode(redeemInput.trim());
        if (success) setRedeemInput('');
    };

    return (
        <Card className="rounded-3xl overflow-hidden">
            {/* Tab Toggle */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab('share')}
                    className={`flex-1 py-4 px-6 font-bold text-sm transition-colors ${
                        activeTab === 'share'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Share Code
                </button>
                <button
                    onClick={() => setActiveTab('redeem')}
                    disabled={hasUsedReferral}
                    className={`flex-1 py-4 px-6 font-bold text-sm transition-colors ${
                        activeTab === 'redeem'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card text-muted-foreground hover:text-foreground'
                    } ${hasUsedReferral ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    Redeem Code
                </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'share' ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-accent">
                            <Gift className="w-5 h-5" />
                            <h3 className="font-bold text-sm">Invite friends. You both get 30 days Pro.</h3>
                        </div>

                        <div className="flex items-center gap-3">
                            <div
                                onClick={!codeLoading ? handleCopy : undefined}
                                className={`flex-1 bg-muted rounded-2xl p-4 flex items-center justify-between transition-colors ${codeLoading ? 'cursor-default' : 'cursor-pointer hover:bg-muted/70'}`}
                            >
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Your Code
                                    </p>
                                    {codeLoading ? (
                                        <div className="animate-pulse bg-muted-foreground/20 rounded h-7 w-32 mt-1" />
                                    ) : (
                                        <p className="text-lg font-black tracking-widest">{referralCode}</p>
                                    )}
                                </div>
                                {copied ? (
                                    <Check className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Copy className={`w-5 h-5 ${codeLoading ? 'text-muted-foreground/40' : 'text-muted-foreground'}`} />
                                )}
                            </div>

                            <Button
                                size="icon"
                                onClick={handleShare}
                                disabled={codeLoading}
                                className="w-12 h-12 rounded-2xl"
                            >
                                <Share2 className="w-5 h-5" />
                            </Button>
                        </div>

                        {friendsInvited > 0 && (
                            <p className="text-xs text-muted-foreground font-medium">
                                {friendsInvited} friend{friendsInvited > 1 ? 's' : ''} joined
                            </p>
                        )}

                        {daysRemaining > 0 && (
                            <div className="flex items-center gap-2 bg-accent/10 text-accent rounded-xl px-3 py-2 w-fit">
                                <Ticket className="w-4 h-4" />
                                <span className="text-xs font-bold">{daysRemaining} days Pro remaining</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-accent" />
                            <h3 className="font-bold text-sm">Enter friend's code to unlock Pro features</h3>
                        </div>

                        {hasUsedReferral ? (
                            <p className="text-sm text-muted-foreground">
                                You have already redeemed a referral code.
                            </p>
                        ) : (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="ENTER CODE"
                                    value={redeemInput}
                                    onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
                                    maxLength={8}
                                    className="rounded-2xl h-12 bg-muted/50 border-none font-black tracking-widest focus-visible:ring-accent"
                                />
                                <Button
                                    onClick={handleRedeem}
                                    disabled={loading || !redeemInput || redeemInput.length < 8}
                                    className="rounded-2xl h-12 px-6 font-bold"
                                >
                                    {loading ? '...' : 'Redeem'}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
