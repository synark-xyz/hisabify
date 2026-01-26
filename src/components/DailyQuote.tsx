import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import quotesData from '../../quotes/fintech-learders-quotes.json';

// Use standard calculation for the day of the year
const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};

export function DailyQuote() {
    const quote = useMemo(() => {
        // Handle potential different import behaviors (default vs named)
        const data = quotesData as any;
        const quotesArray = data.quotes || data.default?.quotes || [];

        if (!Array.isArray(quotesArray) || quotesArray.length === 0) return null;

        const dayOfYear = getDayOfYear();
        const index = dayOfYear % quotesArray.length;
        return quotesArray[index];
    }, []);

    if (!quote) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 mb-2 px-1"
        >
            <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 overflow-hidden group hover:bg-card/80 transition-colors">
                {/* Decorative Icon */}
                <Quote className="absolute top-4 right-4 w-12 h-12 text-muted-foreground/5 pointer-events-none rotate-180" />

                <div className="relative z-10">
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic mb-3">
                        "... {quote.quote} ..."
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="h-0.5 w-6 bg-accent/50 rounded-full" />
                        <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                            {quote.author}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
