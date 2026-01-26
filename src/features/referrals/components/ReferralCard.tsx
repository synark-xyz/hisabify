import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Gift, Ticket } from 'lucide-react';
import { useReferral } from '../hooks/useReferral';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function ReferralCard() {
    const { referralCode, credits, redeemCode, loading } = useReferral();
    const [redeemInput, setRedeemInput] = useState('');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (referralCode) {
            navigator.clipboard.writeText(referralCode);
            setCopied(true);
            toast.success('Code copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = async () => {
        if (navigator.share && referralCode) {
            try {
                await navigator.share({
                    title: 'Join me on Hisabify!',
                    text: `Use my referral code ${referralCode} to get 30 days of Pro features for free!`,
                    url: window.location.origin,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            handleCopy();
        }
    };

    const handleRedeem = async () => {
        if (!redeemInput.trim()) return;
        const success = await redeemCode(redeemInput.trim());
        if (success) setRedeemInput('');
    };

    return (
        <div className="space-y-4">
            {/* Invite Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-5 h-5 text-yellow-300" />
                        <span className="text-xs font-black uppercase tracking-widest text-white/80">Affiliate Program</span>
                    </div>

                    <h3 className="text-xl font-black mb-1">Give 30, Get 30</h3>
                    <p className="text-sm text-white/80 mb-6">
                        Invite a friend. When they join, you both get 30 days of Pro features.
                    </p>

                    <div className="flex items-center gap-3">
                        <div
                            onClick={handleCopy}
                            className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/20 cursor-pointer hover:bg-white/30 transition-colors"
                        >
                            <div>
                                <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Your Code</p>
                                <p className="text-lg font-black tracking-widest">{referralCode || '------'}</p>
                            </div>
                            {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5 opacity-50" />}
                        </div>

                        <Button
                            size="icon"
                            onClick={handleShare}
                            className="w-14 h-14 rounded-2xl bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg"
                        >
                            <Share2 className="w-6 h-6" />
                        </Button>
                    </div>

                    {credits > 0 && (
                        <div className="mt-4 flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2 w-fit">
                            <Ticket className="w-4 h-4 text-yellow-300" />
                            <span className="text-xs font-bold">{credits} Months Pro Earned</span>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Redeem Section */}
            <div className="bg-card rounded-3xl p-6 border border-border/50">
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-accent" />
                    Have a referral code?
                </h4>
                <div className="flex gap-2">
                    <Input
                        placeholder="ENTER CODE"
                        value={redeemInput}
                        onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
                        className="rounded-2xl h-12 bg-muted/50 border-none font-black tracking-widest focus-visible:ring-accent"
                    />
                    <Button
                        onClick={handleRedeem}
                        disabled={loading || !redeemInput}
                        className="rounded-2xl h-12 px-6 font-bold"
                    >
                        {loading ? '...' : 'Redeem'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
