import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Infinity, Globe, PieChart } from "lucide-react";
import { motion } from "framer-motion";

interface UpgradeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
    const features = [
        {
            icon: Infinity,
            title: "Unlimited Budgets",
            description: "Create as many categories as you need"
        },
        {
            icon: Zap,
            title: "Smart Automation",
            description: "Auto-renewal & recurring transactions"
        },
        {
            icon: Globe,
            title: "Multi-Currency",
            description: "Live exchange rates & conversions"
        },
        {
            icon: PieChart,
            title: "Deep Analytics",
            description: "Unlimited history & export capabilities"
        }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md overflow-hidden p-0 border-0 bg-background/80 backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-fuchsia-500/10" />

                <div className="relative p-6 space-y-6">
                    <DialogHeader className="space-y-4 text-center">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 mx-auto flex items-center justify-center shadow-lg shadow-purple-500/20"
                        >
                            <Sparkles className="w-8 h-8 text-white" />
                        </motion.div>

                        <div className="space-y-2">
                            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                                Unlock Hisabify Pro
                            </DialogTitle>
                            <DialogDescription className="text-base">
                                Supercharge your financial journey with premium tools.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4">
                        {features.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50 border border-border/50"
                            >
                                <div className="p-2 rounded-lg bg-background shadow-sm">
                                    <feature.icon className="w-5 h-5 text-violet-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{feature.title}</h4>
                                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-2">
                        <Button
                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
                            onClick={() => {
                                // In a real app, this would trigger Stripe checkout
                                window.location.href = "mailto:support@hisabify.com?subject=Upgrade%20Request";
                            }}
                        >
                            Get Pro for $4.99/mo
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            Secure payment via Stripe. Cancel anytime.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
