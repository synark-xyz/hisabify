import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, Check, Sparkles, TrendingUp, Shield, Zap,
    PieChart, Target, Wallet, Bell, Gift, Star, CreditCard, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HisabifyLogo } from '@/components/HisabifyLogo';

function useSmallScreen() {
    const [isSmall, setIsSmall] = useState(() => window.innerHeight < 700);
    useEffect(() => {
        const handler = () => setIsSmall(window.innerHeight < 700);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isSmall;
}

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

interface OnboardingPageProps {
    /** Called when the user completes or skips onboarding. If provided, the
     *  parent is responsible for persisting the flag and navigating away. */
    onComplete?: () => void;
}

export function OnboardingPage({ onComplete }: OnboardingPageProps = {}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const navigate = useNavigate();
    const controls = useAnimation();
    const isSmall = useSmallScreen();

    useEffect(() => {
        controls.start({
            scale: [1, 1.25, 1],
            transition: { duration: 1, repeat: Infinity, ease: "easeInOut" }
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
        if (onComplete) {
            onComplete();
        } else {
            localStorage.setItem('hasSeenOnboarding', 'true');
            navigate('/auth');
        }
    };

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -100 : 100,
            opacity: 0,
            scale: 0.95
        })
    };

    const currentSlide = slides[currentIndex];

    return (
        <div className="min-h-screen-dynamic bg-background flex flex-col relative overflow-hidden overflow-y-auto pt-safe pb-safe">
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px]"
                    style={{
                        background: `linear-gradient(to bottom right, var(--gradient-color-1), var(--gradient-color-2))`,
                        willChange: 'transform, opacity'
                    }}
                    key={`gradient-top-${currentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{
                        scale: [1, 1.12, 1],
                        opacity: [0.18, 0.28, 0.18],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: [0.4, 0, 0.6, 1],
                        opacity: { duration: 3, ease: [0.4, 0, 0.2, 1] }
                    }}
                />
                <motion.div
                    className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px]"
                    style={{
                        background: `linear-gradient(to top right, var(--gradient-color-2), var(--gradient-color-3))`,
                        willChange: 'transform, opacity'
                    }}
                    key={`gradient-bottom-${currentIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{
                        scale: [1.12, 1, 1.12],
                        opacity: [0.15, 0.25, 0.15],
                    }}
                    transition={{
                        duration: 14,
                        repeat: Infinity,
                        ease: [0.4, 0, 0.6, 1],
                        delay: 3,
                        opacity: { duration: 3.5, ease: [0.4, 0, 0.2, 1] }
                    }}
                />
            </div>

            <style>{`
                :root {
                    --gradient-color-1: ${currentIndex === 0 ? '#3B82F6' : currentIndex === 1 ? '#8B5CF6' : currentIndex === 2 ? '#10B981' : '#F59E0B'};
                    --gradient-color-2: ${currentIndex === 0 ? '#22D3EE' : currentIndex === 1 ? '#EC4899' : currentIndex === 2 ? '#14B8A6' : '#FBBF24'};
                    --gradient-color-3: ${currentIndex === 0 ? '#60A5FA' : currentIndex === 1 ? '#F472B6' : currentIndex === 2 ? '#34D399' : '#FCD34D'};
                }
            `}</style>

            {/* Skip Button with safe area */}
            <motion.div
                className="absolute top-0 right-0 z-50 pt-safe pr-4"
                initial={{ opacity: 0, x: 15, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{
                    delay: 0.1,
                    duration: 0.6,
                    ease: [0.4, 0, 0.2, 1]
                }}
            >
                <motion.button
                    onClick={handleComplete}
                    className="text-sm font-bold text-muted-foreground hover:text-foreground px-4 py-3 rounded-full hover:bg-muted/50 mt-2 backdrop-blur-sm"
                    whileHover={{
                        scale: 1.05,
                        backgroundColor: "rgba(0, 0, 0, 0.05)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                >
                    Skip
                </motion.button>
            </motion.div>

            {/* Logo/Brand */}
            <motion.div
                className="absolute top-0 left-0 z-50 pt-safe pl-6 mt-2"
                initial={{ opacity: 0, y: -15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    delay: 0.1,
                    duration: 0.6,
                    ease: [0.4, 0, 0.2, 1]
                }}
            >
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                >
                    <HisabifyLogo size={isSmall ? 32 : 40} showText={true} />
                </motion.div>
            </motion.div>

            {/* Main Content */}
            <div className={cn("flex-1 flex flex-col items-center justify-center px-6 relative z-10", isSmall ? "py-3" : "py-8")}>
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
                                x: { type: "spring", stiffness: 260, damping: 30 },
                                opacity: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
                                scale: { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
                            }}
                            className="flex flex-col items-center text-center"
                        >
                            {/* Floating Icons Background */}
                            <div className={cn("relative w-full mb-8", isSmall ? "h-32" : "h-48")}>
                                {currentSlide.floatingIcons.map((Icon, index) => {
                                    // Different positions for each icon (more spread out)
                                    const positions = isSmall
                                        ? [
                                            { left: '6%', top: '10%' },
                                            { left: '72%', top: '15%' },
                                            { left: '12%', top: '60%' }
                                          ]
                                        : [
                                            { left: '8%', top: '15%' },
                                            { left: '75%', top: '20%' },
                                            { left: '15%', top: '65%' }
                                          ];

                                    // Ultra-smooth floating animations
                                    const animations = [
                                        { y: [0, -12, 0], x: [0, 6, 0], rotate: [0, 6, -3, 0] },
                                        { y: [0, 10, 0], x: [0, -5, 0], rotate: [0, -5, 5, 0] },
                                        { y: [0, -8, 0], x: [0, 8, 0], rotate: [0, 8, -8, 0] }
                                    ];

                                    // Varied sizes for depth
                                    const sizes = ['w-7 h-7', 'w-9 h-9', 'w-8 h-8'];
                                    const paddings = ['p-3', 'p-4', 'p-3.5'];

                                    // Smooth easing for organic movement
                                    const easings = [
                                        [0.45, 0, 0.55, 1],
                                        [0.42, 0, 0.58, 1],
                                        [0.47, 0, 0.53, 1]
                                    ];

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
                                                scale: {
                                                    type: "spring",
                                                    stiffness: 160,
                                                    damping: 24,
                                                    delay: 0.25 + index * 0.12
                                                },
                                                opacity: {
                                                    duration: 0.5,
                                                    ease: [0.4, 0, 0.2, 1],
                                                    delay: 0.25 + index * 0.12
                                                },
                                                y: {
                                                    duration: 4 + index * 0.6,
                                                    repeat: Infinity,
                                                    ease: easings[index],
                                                    delay: index * 0.5,
                                                    repeatType: "reverse"
                                                },
                                                x: {
                                                    duration: 4.5 + index * 0.6,
                                                    repeat: Infinity,
                                                    ease: easings[index],
                                                    delay: index * 0.4,
                                                    repeatType: "reverse"
                                                },
                                                rotate: {
                                                    duration: 6 + index * 0.8,
                                                    repeat: Infinity,
                                                    ease: easings[index],
                                                    delay: index * 0.3,
                                                    repeatType: "reverse"
                                                }
                                            }}
                                        >
                                            <Icon className={cn("text-white", sizes[index])} />
                                        </motion.div>
                                    );
                                })}

                                {/* Main Icon with subtle pulse */}
                                <motion.div
                                    className={cn(
                                        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center shadow-2xl bg-gradient-to-br z-10",
                                        isSmall ? "w-20 h-20 rounded-2xl" : "w-28 h-28 rounded-3xl",
                                        currentSlide.color
                                    )}
                                    key={`main-icon-${currentIndex}`}
                                    initial={{ scale: 0, rotate: -45, opacity: 0 }}
                                    animate={{
                                        scale: 1,
                                        rotate: 0,
                                        opacity: 1
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 160,
                                        damping: 20,
                                        delay: 0.2,
                                        opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                                    }}
                                >
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.05, 1],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: [0.4, 0, 0.6, 1],
                                            repeatType: "reverse"
                                        }}
                                    >
                                        <currentSlide.icon className={cn("text-white", isSmall ? "w-10 h-10" : "w-14 h-14")} />
                                    </motion.div>
                                </motion.div>
                            </div>

                            {/* Pain Point Title */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: 0.25,
                                    duration: 0.5,
                                    ease: [0.4, 0, 0.2, 1]
                                }}
                                className="mb-2"
                            >
                                <h2 className={cn("font-black tracking-tight text-foreground", isSmall ? "text-2xl" : "text-3xl md:text-4xl")}>
                                    {currentSlide.title}
                                </h2>
                            </motion.div>

                            {/* Subtitle */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{
                                    delay: 0.35,
                                    duration: 0.4,
                                    ease: [0.4, 0, 0.2, 1]
                                }}
                                className={cn(
                                    "inline-block px-4 py-2 rounded-full text-sm font-bold mb-4 bg-gradient-to-r shadow-lg",
                                    currentSlide.color,
                                    "text-white"
                                )}
                            >
                                {currentSlide.subtitle}
                            </motion.div>

                            {/* Description */}
                            <motion.p
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: 0.42,
                                    duration: 0.5,
                                    ease: [0.4, 0, 0.2, 1]
                                }}
                                className={cn("text-muted-foreground leading-relaxed max-w-sm", isSmall ? "text-sm mb-4" : "text-base md:text-lg mb-8")}
                            >
                                {currentSlide.description}
                            </motion.p>

                            {/* Feature Pills */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                    delay: 0.5,
                                    duration: 0.4,
                                    ease: [0.4, 0, 0.2, 1]
                                }}
                                className={cn("flex flex-wrap justify-center", isSmall ? "gap-2" : "gap-3")}
                            >
                                {currentSlide.features.map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.88, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        transition={{
                                            delay: 0.55 + index * 0.1,
                                            duration: 0.45,
                                            ease: [0.34, 1.56, 0.64, 1],
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 15
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 rounded-full border-2 backdrop-blur-sm",
                                            isSmall ? "px-3 py-1.5" : "px-4 py-2.5",
                                            currentSlide.bgColor,
                                            "border-current shadow-sm"
                                        )}
                                        whileHover={{
                                            scale: 1.06,
                                            y: -3,
                                            boxShadow: "0 8px 16px -4px rgba(0, 0, 0, 0.15)"
                                        }}
                                        whileTap={{ scale: 0.96 }}
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
            <div className={cn("px-6 w-full max-w-md mx-auto relative z-10", isSmall ? "pb-4" : "pb-8")}>
                <div className="flex flex-col gap-4">
                    {/* Pagination Indicators */}
                    <div className="flex gap-2 justify-center items-center">
                        {slides.map((_, index) => (
                            <motion.button
                                key={index}
                                onClick={() => {
                                    setDirection(index > currentIndex ? 1 : -1);
                                    setCurrentIndex(index);
                                }}
                                className="relative"
                            >
                                <motion.div
                                    className={cn(
                                        "h-2 rounded-full",
                                        index === currentIndex ? "bg-foreground" : "bg-muted-foreground/30"
                                    )}
                                    animate={{
                                        width: index === currentIndex ? 32 : 8
                                    }}
                                    transition={{
                                        duration: 0.4,
                                        ease: [0.4, 0, 0.2, 1]
                                    }}
                                    whileHover={{
                                        scale: 1.4,
                                        backgroundColor: index === currentIndex
                                            ? "hsl(var(--foreground))"
                                            : "hsl(var(--foreground) / 0.5)"
                                    }}
                                    whileTap={{ scale: 0.8 }}
                                />
                                {index === currentIndex && (
                                    <motion.div
                                        className="absolute inset-0 bg-foreground/30 rounded-full blur-sm"
                                        layoutId="activeIndicator"
                                        transition={{
                                            duration: 0.4,
                                            ease: [0.4, 0, 0.2, 1]
                                        }}
                                    />
                                )}
                            </motion.button>
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-4">
                        {/* Back Button */}
                        {currentIndex > 0 && (
                            <motion.button
                                initial={{ opacity: 0, x: -12, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -12, scale: 0.95 }}
                                transition={{
                                    duration: 0.3,
                                    ease: [0.4, 0, 0.2, 1]
                                }}
                                onClick={handlePrev}
                                className="px-6 py-3 rounded-full font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 backdrop-blur-sm"
                                whileHover={{
                                    scale: 1.05,
                                    backgroundColor: "rgba(0, 0, 0, 0.05)"
                                }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Back
                            </motion.button>
                        )}

                        {/* Next/Get Started Button */}
                        <motion.button
                            onClick={handleNext}
                            className={cn(
                                "relative flex-1 rounded-full px-8 text-white shadow-xl font-bold text-base bg-gradient-to-r flex items-center justify-center gap-2 overflow-hidden",
                                isSmall ? "h-12" : "h-14",
                                currentSlide.color
                            )}
                            whileHover={{
                                scale: 1.04,
                                boxShadow: "0 24px 48px -12px rgba(0,0,0,0.4)"
                            }}
                            whileTap={{ scale: 0.96 }}
                            transition={{
                                duration: 0.25,
                                ease: [0.4, 0, 0.2, 1]
                            }}
                            style={{ marginLeft: currentIndex === 0 ? 'auto' : '0' }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-white/20"
                                initial={{ x: '-100%' }}
                                whileHover={{ x: '100%' }}
                                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                            />
                            <span className="relative z-10">
                                {currentSlide.isFinal ? 'Get Started Free' : 'Next'}
                            </span>
                            <motion.div
                                className="relative z-10"
                                animate={{ x: [0, 3, 0] }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: [0.4, 0, 0.6, 1]
                                }}
                            >
                                {currentSlide.isFinal ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <ArrowRight className="w-5 h-5" />
                                )}
                            </motion.div>
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
}
