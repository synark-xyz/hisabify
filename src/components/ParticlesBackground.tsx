import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

interface Particle {
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    colorType: 'primary' | 'secondary' | 'accent';
}

export const ParticlesBackground = () => {
    const { variant, theme } = useTheme();

    const particles = useMemo(() => {
        return Array.from({ length: 25 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 120 + 40,
            duration: Math.random() * 25 + 15,
            delay: Math.random() * 5,
            colorType: ['primary', 'secondary', 'accent'][Math.floor(Math.random() * 3)] as 'primary' | 'secondary' | 'accent'
        }));
    }, []);

    // Get theme-aware particle colors with proper visibility
    const getParticleStyle = (colorType: string) => {
        if (variant === 'cyberpunk') {
            // Cyberpunk theme - Teal and Gold
            if (theme === 'light') {
                return {
                    primary: { backgroundColor: 'rgba(0, 168, 168, 0.15)' },   // Darker teal
                    secondary: { backgroundColor: 'rgba(204, 136, 0, 0.15)' }, // Darker gold
                    accent: { backgroundColor: 'rgba(168, 85, 247, 0.12)' },   // Purple
                }[colorType];
            } else {
                return {
                    primary: { backgroundColor: 'rgba(0, 255, 255, 0.18)' },   // Neon teal
                    secondary: { backgroundColor: 'rgba(255, 215, 0, 0.18)' }, // Neon gold
                    accent: { backgroundColor: 'rgba(255, 45, 149, 0.15)' },   // Neon pink
                }[colorType];
            }
        } else {
            // Default theme - Orange and Purple
            if (theme === 'light') {
                return {
                    primary: { backgroundColor: 'rgba(255, 152, 0, 0.15)' },    // Orange
                    secondary: { backgroundColor: 'rgba(108, 60, 225, 0.15)' }, // Purple
                    accent: { backgroundColor: 'rgba(168, 85, 247, 0.13)' },    // Purple accent
                }[colorType];
            } else {
                return {
                    primary: { backgroundColor: 'rgba(255, 152, 0, 0.12)' },    // Orange
                    secondary: { backgroundColor: 'rgba(108, 60, 225, 0.12)' }, // Purple
                    accent: { backgroundColor: 'rgba(168, 85, 247, 0.10)' },    // Purple accent
                }[colorType];
            }
        }
    };

    return (
        <div
            className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
            style={{ contain: 'strict', willChange: 'transform' }}
        >
            {/* Solid Background Layer - Only for Cyberpunk Light */}
            {variant === 'cyberpunk' && theme === 'light' && (
                <div className="absolute inset-0 -z-10 bg-background" />
            )}
            {/* Animated Particles */}
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full blur-2xl"
                    initial={{
                        x: `${particle.x}vw`,
                        y: `${particle.y}vh`,
                        opacity: 0,
                        scale: 0.5
                    }}
                    animate={{
                        x: [
                            `${particle.x}vw`,
                            `${(particle.x + Math.random() * 30 - 15 + 100) % 100}vw`,
                            `${particle.x}vw`
                        ],
                        y: [
                            `${particle.y}vh`,
                            `${(particle.y + Math.random() * 30 - 15 + 100) % 100}vh`,
                            `${particle.y}vh`
                        ],
                        opacity: theme === 'light'
                            ? [0.6, 1, 0.6]  // Clearly visible in light mode
                            : [0.5, 0.8, 0.5], // Visible in dark mode
                        scale: [1, 1.3, 1]
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: particle.delay
                    }}
                    style={{
                        width: particle.size,
                        height: particle.size,
                        ...getParticleStyle(particle.colorType),
                        willChange: 'transform, opacity',
                        backfaceVisibility: 'hidden',
                        perspective: 1000,
                    }}
                />
            ))}

            {/* Gradient Overlay for better blending */}
            <div
                className={cn(
                    "absolute inset-0",
                    variant === 'cyberpunk' && theme === 'light'
                        ? "bg-gradient-to-b from-background/20 via-transparent to-background/20"
                        : variant === 'cyberpunk'
                        ? "bg-transparent"
                        : theme === 'light'
                        ? "bg-gradient-to-b from-background/20 via-transparent to-background/20"
                        : "bg-gradient-to-b from-background/40 via-transparent to-background/40"
                )}
                style={{ willChange: 'backdrop-filter' }}
            />
        </div>
    );
};
