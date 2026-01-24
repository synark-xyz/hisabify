
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export const ParticlesBackground = () => {
    const particles = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 100 + 20,
            duration: Math.random() * 20 + 10,
            delay: Math.random() * 5
        }));
    }, []);

    return (
        <div className="fixed inset-0 -z-10 bg-background overflow-hidden">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full bg-primary/5 blur-3xl"
                    initial={{
                        x: `${particle.x}vw`,
                        y: `${particle.y}vh`,
                        opacity: 0,
                        scale: 0.5
                    }}
                    animate={{
                        x: [
                            `${particle.x}vw`,
                            `${(particle.x + Math.random() * 20 - 10 + 100) % 100}vw`,
                            `${particle.x}vw`
                        ],
                        y: [
                            `${particle.y}vh`,
                            `${(particle.y + Math.random() * 20 - 10 + 100) % 100}vh`,
                            `${particle.y}vh`
                        ],
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.2, 1]
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
                    }}
                />
            ))}
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px]" />
        </div>
    );
};
