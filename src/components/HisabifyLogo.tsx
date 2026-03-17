import { cn } from '@/lib/utils';

interface HisabifyLogoProps {
    size?: number;
    className?: string;
    showText?: boolean;
}

export function HisabifyLogo({ size = 40, className, showText = true }: HisabifyLogoProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            {/* Logo icon — paths mirror logo_vector.xml exactly (1024×1024 viewport) */}
            <svg
                width={size}
                height={size}
                viewBox="0 0 1024 1024"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                <defs>
                    {/* Gradient for the dollar sign path */}
                    <linearGradient id="dollarGrad" x1="400" y1="350" x2="350" y2="650" gradientUnits="userSpaceOnUse">
                        <stop offset="0"   stopColor="#60A5FA" />
                        <stop offset="0.3" stopColor="#8B5CF6" />
                        <stop offset="0.6" stopColor="#EC4899" />
                        <stop offset="1"   stopColor="#FCD34D" />
                    </linearGradient>
                </defs>

                {/* Background ring — fills the empty (left-half) portion of the donut */}
                <circle cx="512" cy="512" r="256" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="144" />

                {/* Arc 1 — Blue */}
                <path
                    d="M512,184 A328,328 0 0,1 774,312 L664,409 A184,184 0 0,0 512,328 Z"
                    fill="#60A5FA"
                    fillOpacity="0.95"
                />

                {/* Arc 2 — Purple */}
                <path
                    d="M774,312 A328,328 0 0,1 840,512 H696 A184,184 0 0,0 664,409 Z"
                    fill="#A78BFA"
                    fillOpacity="0.95"
                />

                {/* Arc 3 — Pink */}
                <path
                    d="M840,512 A328,328 0 0,1 712,774 L623,664 A184,184 0 0,0 696,512 Z"
                    fill="#F472B6"
                    fillOpacity="0.95"
                />

                {/* Arc 4 — Yellow */}
                <path
                    d="M712,774 A328,328 0 0,1 512,840 V696 A184,184 0 0,0 623,664 Z"
                    fill="#FCD34D"
                    fillOpacity="0.95"
                />

                {/* Inner white circle (donut hole) */}
                <path
                    d="M512,338 a174,174 0 1,1 0,348 a174,174 0 1,1 0,-348"
                    fill="white"
                    fillOpacity="0.98"
                />

                {/* Dollar symbol — gradient path matching logo_vector.xml */}
                <path
                    d="M505,390
                       c-42,4 -74,32 -74,70
                       c0,34 26,55 72,65
                       c42,9 54,19 54,35
                       c0,19 -18,33 -44,33
                       c-27,0 -46,-12 -54,-31
                       l-43,18
                       c10,29 37,49 75,54
                       v42 h36 v-40
                       c46,-5 78,-33 78,-73
                       c0,-36 -22,-56 -70,-68
                       c-44,-11 -57,-19 -57,-34
                       c0,-17 15,-28 40,-28
                       c22,0 38,9 47,25
                       l40,-19
                       c-11,-25 -35,-42 -67,-46
                       v-40 h-36 Z"
                    fill="url(#dollarGrad)"
                />
            </svg>

            {showText && (
                <span className="text-xl font-black tracking-tight">Hisabify</span>
            )}
        </div>
    );
}
