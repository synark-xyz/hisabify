import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/types';
import { cn } from '@/lib/utils';

interface CardStackProps {
  cards: Card[];
  totalBalance: number;
  onCardClick?: (card: Card) => void;
}

export function CardStack({ cards, totalBalance, onCardClick }: CardStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCard = cards[activeIndex] || null;

  const nextCard = () => {
    setActiveIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const formatCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.map((group, i) => (i < groups.length - 1 ? '••••' : group)).slice(-4);
  };

  const cardColors: Record<string, string> = {
    purple: 'from-[#5B4B8A] via-[#7B6BA8] to-[#8B7BB8]',
    green: 'from-emerald-600 via-emerald-500 to-teal-400',
    orange: 'from-orange-500 via-orange-400 to-amber-400',
  };

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full">
      {/* Card Stack Visual */}
      <div
        className="relative cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Background cards for stack effect */}
        {cards.length > 1 && (
          <>
            <motion.div
              className={cn(
                'absolute inset-x-2 top-2 h-full rounded-2xl opacity-40 bg-gradient-to-br',
                cardColors[cards[(activeIndex + 2) % cards.length]?.color || 'purple']
              )}
              style={{ zIndex: 0 }}
            />
            <motion.div
              className={cn(
                'absolute inset-x-1 top-1 h-full rounded-2xl opacity-60 bg-gradient-to-br',
                cardColors[cards[(activeIndex + 1) % cards.length]?.color || 'purple']
              )}
              style={{ zIndex: 1 }}
            />
          </>
        )}

        {/* Active Card */}
        <motion.div
          className={cn(
            'relative w-full aspect-[1.7] rounded-2xl p-5 bg-gradient-to-br shadow-xl overflow-hidden',
            cardColors[activeCard?.color || 'purple']
          )}
          style={{ zIndex: 2 }}
          whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Inner highlight */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
          
          {/* Card content */}
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/70 text-sm font-medium">Total Balance</p>
                <motion.p
                  className="text-white text-3xl font-bold mt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={totalBalance}
                >
                  ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </motion.p>
              </div>
              <button className="text-white/60 hover:text-white transition-colors p-1">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-between items-end">
              <div className="flex gap-4 text-white/90 text-sm font-medium tracking-wider">
                {formatCardNumber(activeCard?.card_number || '0000000000000000').map((group, i) => (
                  <span key={i}>{group}</span>
                ))}
              </div>
              
              {/* Mastercard logo */}
              <div className="flex -space-x-3">
                <div className="w-8 h-8 rounded-full bg-red-500/90" />
                <div className="w-8 h-8 rounded-full bg-orange-400/90" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Card navigation dots */}
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={(e) => { e.stopPropagation(); prevCard(); }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {cards.map((_, index) => (
              <motion.button
                key={index}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(index); }}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === activeIndex ? 'w-6 bg-accent' : 'w-2 bg-muted-foreground/30'
                )}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); nextCard(); }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
