import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, Check, Sparkles, TrendingUp, Shield, Zap,
    PieChart, Target, Wallet, Bell, Gift, Star, CreditCard, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HisabifyLogo } from '@/components/HisabifyLogo';

const slides = [
    {
        id: 1,
        icon: Wallet,
        title: "Money Scattered Everywhere?",
        subtitle: "We bring it all together",
        description: "Track expenses across multiple cards and accounts in one beautiful place. No more juggling apps.",
        color: "from-blue-500 to-cyan-400",
        bgColor: "bg-blue-500/10",
        features: [
            { icon: CreditCard, text: "Multi-card tracking" },
            { icon: Zap, text: "Quick expense logging" },
            { icon: Shield, text: "Bank-level security" }
        ],
        floatingIcons: [CreditCard, Star, Zap]
    },
    {
        id: 2,
        icon: Bell,
        title: "Tired of Bill Surprises?",
        subtitle: "Never miss a payment again",
        description: "Smart reminders for all your bills and subscriptions. Stay on top of due dates effortlessly.",
        color: "from-purple-500 to-pink-400",
        bgColor: "bg-purple-500/10",
        features: [
            { icon: Bell, text: "Smart notifications" },
            { icon: Target, text: "Budget alerts" },
            { icon: Gift, text: "Savings milestones" }
        ],
        floatingIcons: [Target, Sparkles, Gift]
    },
    {
        id: 3,
        icon: PieChart,
        title: "Where Does Money Go?",
        subtitle: "Crystal clear insights",
        description: "Beautiful charts show exactly where you spend. Make smarter decisions with real data.",
        color: "from-emerald-500 to-teal-400",
        bgColor: "bg-emerald-500/10",
        features: [
            { icon: PieChart, text: "Visual analytics" },
            { icon: BarChart3, text: "Spending trends" },
            { icon: TrendingUp, text: "Growth tracking" }
        ],
        floatingIcons: [BarChart3, TrendingUp, Sparkles]
    },
    {
        id: 4,
        icon: Target,
        title: "Ready to Take Control?",
        subtitle: "Your financial freedom starts here",
        description: "Join thousands who've simplified their finances. Set goals, track progress, achieve more.",
        color: "from-orange-500 to-amber-400",
        bgColor: "bg-orange-500/10",
        features: [
            { icon: Target, text: "Goal setting" },
            { icon: Sparkles, text: "Premium features" },
            { icon: Star, text: "No hidden fees" }
        ],
        floatingIcons: [Star, Gift, Zap],
        isFinal: true
    }
];

export function OnboardingPage() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const navigate = useNavigate();
    const controls = useAnimation();

    useEffect(() => {
        controls.start({
            scale: [1, 1.05, 1],
            transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        });
    }, [controls]);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('hasSeenOnboarding', 'true');
        navigate('/auth');
    };

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.8
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -300 : 300,
            opacity: 0,
            scale: 0.8
        })
    };

    const currentSlide = slides[currentIndex];

    return (
        <div className="min-h-screen bg-background flex flex-col relative overflow-hidden pt-safe pb-safe">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className={cn(
                        "absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000",
                        `bg-gradient-to-br ${currentSlide.color}`
                    )}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.3, 0.2],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    style={{ willChange: 'transform, opacity' }}
                />
                <motion.div
                    className={cn(
                        "absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000",
                        `bg-gradient-to-tr ${currentSlide.color}`
                    )}
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.15, 0.25, 0.15],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    style={{ willChange: 'transform, opacity' }}
                />
            </div>

            {/* Skip Button with safe area */}
            <div className="absolute top-0 right-0 z-50 pt-safe pr-4">
                <motion.button
                    onClick={handleComplete}
                    className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors px-4 py-3 rounded-full hover:bg-muted/50 mt-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Skip
                </motion.button>
            </div>

            {/* Logo/Brand */}
            <motion.div
                className="absolute top-0 left-0 z-50 pt-safe pl-6 mt-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <HisabifyLogo size={40} showText={true} />
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
                <div className="w-full max-w-md">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 350, damping: 30 },
                                opacity: { duration: 0.2 },
                                scale: { duration: 0.2 }
                            }}
                            className="flex flex-col items-center text-center"
                        >
                            {/* Floating Icons Background */}
                            <div className="relative w-full h-48 mb-8">
                                {currentSlide.floatingIcons.map((Icon, index) => {
                                    // Different positions for each icon (more spread out)
                                    const positions = [
                                        { left: '8%', top: '15%' },
                                        { left: '75%', top: '20%' },
                                        { left: '15%', top: '65%' }
                                    ];

                                    // Different animation patterns for each icon
                                    const animations = [
                                        { y: [0, -20, 0], x: [0, 10, 0], rotate: [0, 10, -5, 0] },
                                        { y: [0, 15, 0], x: [0, -8, 0], rotate: [0, -8, 8, 0] },
                                        { y: [0, -12, 0], x: [0, 12, 0], rotate: [0, 12, -12, 0] }
                                    ];

                                    // Different sizes
                                    const sizes = ['w-7 h-7', 'w-9 h-9', 'w-8 h-8'];
                                    const paddings = ['p-3', 'p-4', 'p-3.5'];

                                    return (
                                        <motion.div
                                            key={`${currentIndex}-${index}`}
                                            className={cn(
                                                "absolute rounded-2xl shadow-lg bg-gradient-to-br",
                                                currentSlide.color,
                                                paddings[index]
                                            )}
                                            style={{
                                                ...positions[index],
                                                willChange: 'transform'
                                            }}
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{
                                                scale: 1,
                                                opacity: 1,
                                                ...animations[index]
                                            }}
                                            transition={{
                                                scale: { type: "spring", stiffness: 200, damping: 20, delay: 0.15 + index * 0.1 },
                                                opacity: { duration: 0.3, delay: 0.15 + index * 0.1 },
                                                y: { duration: 2.5 + index * 0.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 },
                                                x: { duration: 3 + index * 0.5, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 },
                                                rotate: { duration: 4 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.15 }
                                            }}
                                        >
                                            <Icon className={cn("text-white", sizes[index])} />
                                        </motion.div>
                                    );
                                })}

                                {/* Main Icon */}
                                <motion.div
                                    className={cn(
                                        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl bg-gradient-to-br z-10",
                                        currentSlide.color
                                    )}
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                                >
                                    <currentSlide.icon className="w-14 h-14 text-white" />
                                </motion.div>
                            </div>

                            {/* Pain Point Title */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="mb-2"
                            >
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                                    {currentSlide.title}
                                </h2>
                            </motion.div>

                            {/* Subtitle */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className={cn(
                                    "inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 bg-gradient-to-r",
                                    currentSlide.color,
                                    "text-white"
                                )}
                            >
                                {currentSlide.subtitle}
                            </motion.div>

                            {/* Description */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.25 }}
                                className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-sm mb-8"
                            >
                                {currentSlide.description}
                            </motion.p>

                            {/* Feature Pills */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-wrap justify-center gap-3"
                            >
                                {currentSlide.features.map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.35 + index * 0.05 }}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-colors",
                                            currentSlide.bgColor,
                                            "border-current"
                                        )}
                                        whileHover={{ scale: 1.05, y: -2 }}
                                    >
                                        <feature.icon className="w-4 h-4" />
                                        <span className="text-sm font-semibold">{feature.text}</span>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Controls with safe area */}
            <div className="px-6 pb-8 w-full max-w-md mx-auto relative z-10">
                <div className="flex flex-col gap-4">
                    {/* Pagination Indicators */}
                    <div className="flex gap-2 justify-center">
                        {slides.map((_, index) => (
                            <motion.button
                                key={index}
                                onClick={() => {
                                    setDirection(index > currentIndex ? 1 : -1);
                                    setCurrentIndex(index);
                                }}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300",
                                    index === currentIndex ? "w-8 bg-foreground" : "w-2 bg-muted-foreground/30"
                                )}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                            />
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-4">
                        {/* Back Button */}
                        {currentIndex > 0 && (
                            <motion.button
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onClick={handlePrev}
                                className="px-6 py-3 rounded-full font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Back
                            </motion.button>
                        )}

                        {/* Next/Get Started Button */}
                        <motion.button
                            onClick={handleNext}
                            className={cn(
                                "flex-1 h-14 rounded-full px-8 text-white shadow-lg font-bold text-base transition-all bg-gradient-to-r flex items-center justify-center gap-2",
                                currentSlide.color
                            )}
                            whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)" }}
                            whileTap={{ scale: 0.98 }}
                            style={{ marginLeft: currentIndex === 0 ? 'auto' : '0' }}
                        >
                            <span>
                                {currentSlide.isFinal ? 'Get Started Free' : 'Next'}
                            </span>
                            {currentSlide.isFinal ? (
                                <Check className="w-5 h-5" />
                            ) : (
                                <ArrowRight className="w-5 h-5" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
}
