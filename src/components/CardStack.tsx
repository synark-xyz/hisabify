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
  const [direction, setDirection] = useState(0);

  const activeCard = cards[activeIndex] || null;

  const nextCard = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setDirection(-1);
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

  // 3D flip animation variants
  const cardVariants = {
    enter: (direction: number) => ({
      rotateY: direction > 0 ? 90 : -90,
      scale: 0.8,
      z: -200,
      opacity: 0,
    }),
    center: {
      rotateY: 0,
      scale: 1,
      z: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    },
    exit: (direction: number) => ({
      rotateY: direction > 0 ? -90 : 90,
      scale: 0.8,
      z: -200,
      opacity: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    }),
  };

  return (
    <div className="relative w-full" style={{ perspective: '1200px' }}>
      {/* 3D Card Container */}
      <div className="relative h-[140px]" style={{ transformStyle: 'preserve-3d' }}>
        {/* Background stacked cards */}
        {cards.length > 1 && (
          <>
            <div
              className={cn(
                'absolute inset-x-4 top-3 h-full rounded-xl opacity-30 bg-gradient-to-br',
                cardColors[cards[(activeIndex + 2) % cards.length]?.color || 'purple']
              )}
              style={{ 
                transform: 'translateZ(-40px) scale(0.92)',
                transformStyle: 'preserve-3d',
              }}
            />
            <div
              className={cn(
                'absolute inset-x-2 top-1.5 h-full rounded-xl opacity-50 bg-gradient-to-br',
                cardColors[cards[(activeIndex + 1) % cards.length]?.color || 'purple']
              )}
              style={{ 
                transform: 'translateZ(-20px) scale(0.96)',
                transformStyle: 'preserve-3d',
              }}
            />
          </>
        )}

        {/* Active Card with 3D flip */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeIndex}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={cn(
              'absolute inset-0 w-full h-full rounded-xl p-4 bg-gradient-to-br shadow-xl overflow-hidden cursor-pointer',
              cardColors[activeCard?.color || 'purple']
            )}
            style={{ 
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
            }}
            whileHover={{ 
              rotateX: 5, 
              rotateY: -5, 
              scale: 1.02,
              transition: { duration: 0.3 }
            }}
            onClick={() => onCardClick?.(activeCard!)}
          >
            {/* Inner highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent pointer-events-none" />
            
            {/* Card content */}
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/70 text-xs font-medium">Total Balance</p>
                  <motion.p
                    className="text-white text-2xl font-bold mt-0.5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={totalBalance}
                  >
                    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </motion.p>
                </div>
                <button className="text-white/60 hover:text-white transition-colors p-1">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between items-end">
                <div className="flex gap-3 text-white/90 text-xs font-medium tracking-wider">
                  {formatCardNumber(activeCard?.card_number || '0000000000000000').map((group, i) => (
                    <span key={i}>{group}</span>
                  ))}
                </div>
                
                {/* Mastercard logo */}
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-red-500/90" />
                  <div className="w-6 h-6 rounded-full bg-orange-400/90" />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Card navigation dots */}
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <motion.button
            onClick={(e) => { e.stopPropagation(); prevCard(); }}
            className="p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <div className="flex gap-1.5">
            {cards.map((_, index) => (
              <motion.button
                key={index}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setDirection(index > activeIndex ? 1 : -1);
                  setActiveIndex(index); 
                }}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === activeIndex ? 'w-5 bg-accent' : 'w-2 bg-muted-foreground/30'
                )}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
            ))}
          </div>
          <motion.button
            onClick={(e) => { e.stopPropagation(); nextCard(); }}
            className="p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
