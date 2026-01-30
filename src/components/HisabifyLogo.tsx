import { cn } from '@/lib/utils';

interface HisabifyLogoProps {
    size?: number;
    className?: string;
    showText?: boolean;
}

export function HisabifyLogo({ size = 40, className, showText = true }: HisabifyLogoProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* Logo Icon */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                </defs>

                {/* Background circle with gradient */}
                <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />

                {/* Donut Chart (main element) */}
                {/* Outer ring - segmented donut chart */}

                {/* Segment 1 - Blue (35%) */}
                <path
                    d="M 50 18 A 32 32 0 0 1 75.5 30.5 L 64.75 40.75 A 18 18 0 0 0 50 32 Z"
                    fill="#60A5FA"
                    opacity="0.95"
                />

                {/* Segment 2 - Purple (30%) */}
                <path
                    d="M 75.5 30.5 A 32 32 0 0 1 82 50 L 68 50 A 18 18 0 0 0 64.75 40.75 Z"
                    fill="#A78BFA"
                    opacity="0.95"
                />

                {/* Segment 3 - Pink (25%) */}
                <path
                    d="M 82 50 A 32 32 0 0 1 69.5 75.5 L 60.75 64.75 A 18 18 0 0 0 68 50 Z"
                    fill="#F472B6"
                    opacity="0.95"
                />

                {/* Segment 4 - Yellow (10%) */}
                <path
                    d="M 69.5 75.5 A 32 32 0 0 1 50 82 L 50 68 A 18 18 0 0 0 60.75 64.75 Z"
                    fill="#FCD34D"
                    opacity="0.95"
                />

                {/* Inner white circle (donut hole) */}
                <circle cx="50" cy="50" r="17" fill="white" opacity="0.98" />

                {/* Dollar symbol in center */}
                <text
                    x="50"
                    y="58"
                    fontSize="20"
                    fontWeight="bold"
                    fill="url(#logoGradient)"
                    textAnchor="middle"
                    fontFamily="system-ui, -apple-system, sans-serif"
                >
                    $
                </text>
            </svg>

            {/* Logo Text */}
            {showText && (
                <span className="text-xl font-black tracking-tight">Hisabify</span>
            )}
        </div>
    );
}
