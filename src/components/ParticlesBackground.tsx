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
    const { theme } = useTheme();

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

    const opacity = theme === 'light' ? 0.15 : 0.12;
    const getParticleStyle = (colorType: string) => ({
        primary: { backgroundColor: `hsl(var(--primary) / ${opacity})` },
        secondary: { backgroundColor: `hsl(var(--accent) / ${opacity})` },
        accent: { backgroundColor: `hsl(var(--accent) / ${opacity * 0.85})` },
    }[colorType]);

    return (
        <div
            className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
            style={{ contain: 'strict', willChange: 'transform' }}
        >
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
                    theme === 'light'
                        ? "bg-gradient-to-b from-background/20 via-transparent to-background/20"
                        : "bg-gradient-to-b from-background/40 via-transparent to-background/40"
                )}
                style={{ willChange: 'backdrop-filter' }}
            />
        </div>
    );
};
