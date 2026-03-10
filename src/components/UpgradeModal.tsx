import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, X } from 'lucide-react';
import { Crown } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

interface UpgradeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    source?: string;
}

const benefits = [
    "Unlimited Budgets",
    "Unlimited Savings Goals",
    "Advanced Analytics & Insights",
    "Budget vs. Spending History",
];

export function UpgradeModal({ open, onOpenChange, source }: UpgradeModalProps) {
    // Just a visual mockup for now as per "Phase 1: Logic & UI Gating"
    const handleUpgrade = () => {
        // In future this would redirect to Stripe
        alert("Payment integration coming soon! This is a demo of the gating.");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[420px] p-0 overflow-hidden border-0 bg-background/80 backdrop-blur-xl">
                <div className="relative">
                    {/* Header Gradient */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />

                    <div className="relative pt-12 px-6 pb-6 text-center">
                        <div className="mx-auto w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-4 transform -rotate-6 icon-glow">
                            <Crown className="w-10 h-10 text-yellow-500" weight="duotone" />
                        </div>

                        <h2 className="text-2xl font-bold mb-2 text-glow">Upgrade to Pro</h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            Unlock the full power of Hisabify and take control of your financial future.
                        </p>

                        <div className="bg-card/50 rounded-2xl p-6 text-left space-y-3 mb-6 border border-border/50 card-3d">
                            {benefits.map((benefit, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                        <Check className="w-3 h-3 text-green-500" />
                                    </div>
                                    <span className="text-sm font-medium">{benefit}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <Button
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition-opacity h-12 text-lg font-bold shadow-lg shadow-purple-500/25 border-glow"
                                onClick={handleUpgrade}
                            >
                                <Sparkles className="w-4 h-4 mr-2 fill-white icon-glow" />
                                Go Pro for $4.99/mo
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full text-muted-foreground"
                                onClick={() => onOpenChange(false)}
                            >
                                Maybe Later
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
