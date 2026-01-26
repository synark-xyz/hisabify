import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, Target, ChartPie, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const slides = [
    {
        id: 1,
        icon: Wallet,
        title: "Track Expenses",
        description: "Effortlessly log your daily spending and keep your finances organized in one secure place.",
        color: "from-blue-500 to-cyan-400"
    },
    {
        id: 2,
        icon: Target,
        title: "Set Smart Budgets",
        description: "Create realistic budgets for different categories and get notified before you overspend.",
        color: "from-emerald-500 to-teal-400"
    },
    {
        id: 3,
        icon: ChartPie,
        title: "Achieve Goals",
        description: "Visualize your financial growth with powerful analytics and reach your savings targets faster.",
        color: "from-purple-500 to-pink-400"
    }
];

export function OnboardingPage() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigate = useNavigate();

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        localStorage.setItem('hasSeenOnboarding', 'true');
        navigate('/auth');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={cn(
                    "absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 transition-colors duration-1000",
                    `bg-gradient-to-br ${slides[currentIndex].color}`
                )} />
                <div className={cn(
                    "absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 transition-colors duration-1000",
                    `bg-gradient-to-tr ${slides[currentIndex].color}`
                )} />
            </div>

            {/* Skip Button */}
            <div className="absolute top-safe-top right-4 z-50 pt-4">
                <button
                    onClick={handleComplete}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                >
                    Skip
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-md">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="flex flex-col items-center text-center"
                        >
                            {/* Icon Card */}
                            <div className={cn(
                                "w-32 h-32 rounded-3xl flex items-center justify-center mb-8 shadow-2xl bg-gradient-to-br",
                                slides[currentIndex].color
                            )}>
                                {(() => {
                                    const Icon = slides[currentIndex].icon;
                                    return <Icon className="w-16 h-16 text-white" />;
                                })()}
                            </div>

                            <h2 className="text-3xl font-black tracking-tight mb-4 text-foreground">
                                {slides[currentIndex].title}
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed max-w-xs">
                                {slides[currentIndex].description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Controls */}
            <div className="p-8 pb-12 w-full max-w-md mx-auto relative z-10">
                <div className="flex items-center justify-between">
                    {/* Pagination Indicators */}
                    <div className="flex gap-2">
                        {slides.map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300",
                                    index === currentIndex ? "w-8 bg-foreground" : "w-2 bg-muted-foreground/30"
                                )}
                            />
                        ))}
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleNext}
                        size="lg"
                        className={cn(
                            "rounded-full px-8 h-14 text-white shadow-lg transition-all duration-300 bg-gradient-to-r hover:scale-105 hover:shadow-xl",
                            slides[currentIndex].color
                        )}
                    >
                        <span className="text-base font-bold mr-2">
                            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                        </span>
                        {currentIndex === slides.length - 1 ? (
                            <Check className="w-5 h-5" />
                        ) : (
                            <ArrowRight className="w-5 h-5" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
