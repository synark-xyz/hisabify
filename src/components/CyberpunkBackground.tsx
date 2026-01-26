import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export function CyberpunkBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', resize);
        resize();

        // Grid properties
        const gridSize = 40;
        let offset = 0;

        // Particles
        const particles: { x: number; y: number; speed: number; size: number; color: string }[] = [];
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                speed: 0.5 + Math.random(),
                size: 1 + Math.random() * 2,
                color: Math.random() > 0.5 ? '#00E5FF' : '#FFD700' // Teal or Gold
            });
        }

        const animate = () => {
            ctx.fillStyle = '#0a0f1c'; // Deep Midnight Blue Base
            ctx.fillRect(0, 0, width, height);

            // Draw Perspective Grid (Retro Game Style)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
            ctx.lineWidth = 1;

            // Vertical lines
            for (let x = 0; x <= width; x += gridSize * 2) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }

            // Horizontal moving lines
            offset = (offset + 0.5) % gridSize;
            for (let y = offset; y <= height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();

            // Scanline effect overlaid
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            for (let y = 0; y < height; y += 4) {
                ctx.fillRect(0, y, width, 1);
            }

            // Draw Particles
            particles.forEach(p => {
                p.y -= p.speed;
                if (p.y < 0) {
                    p.y = height;
                    p.x = Math.random() * width;
                }

                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            requestAnimationFrame(animate);
        };

        const animId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animId);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />

            {/* Vignette & Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-[#0a0f1c]/50" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0f1c_90%)]" />
        </div>
    );
}
