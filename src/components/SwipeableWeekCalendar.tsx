import { useState } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { startOfWeek, addDays, isSameDay, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatDate } from '@/lib/formatDate';

interface SwipeableWeekCalendarProps {
    currentDate: Date;
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    onWeekChange: (direction: 'prev' | 'next') => void;
    hasTransactions?: (date: Date) => boolean;
    isSelectable?: boolean;
}

export function SwipeableWeekCalendar({
    currentDate,
    selectedDate,
    onDateSelect,
    onWeekChange,
    hasTransactions,
    isSelectable = true
}: SwipeableWeekCalendarProps) {
    const controls = useAnimation();
    const [dragging, setDragging] = useState(false);
    const { t } = useTranslation();
    const { formatDate } = useFormatDate();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    const onDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setDragging(false);
        const threshold = 50;
        const velocity = info.velocity.x;

        if (info.offset.x > threshold || velocity > 500) {
            await controls.start({ x: 100, opacity: 0, transition: { duration: 0.2 } });
            onWeekChange('prev');
            controls.set({ x: -100, opacity: 0 });
            await controls.start({ x: 0, opacity: 1, transition: { duration: 0.2 } });
        } else if (info.offset.x < -threshold || velocity < -500) {
            await controls.start({ x: -100, opacity: 0, transition: { duration: 0.2 } });
            onWeekChange('next');
            controls.set({ x: 100, opacity: 0 });
            await controls.start({ x: 0, opacity: 1, transition: { duration: 0.2 } });
        } else {
            controls.start({ x: 0, opacity: 1 });
        }
    };

    return (
        <div className="relative overflow-hidden bg-card/60 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-card card-3d transition-all">
            {/* Day Labels */}
            <div className="grid grid-cols-7 gap-1 mb-3">
                {days.map((day, i) => (
                    <div key={i} className="text-center text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60">
                        {formatDate(day, 'EEEEE')}
                    </div>
                ))}
            </div>

            {/* Swipeable Area */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragStart={() => setDragging(true)}
                onDragEnd={onDragEnd}
                animate={controls}
                className="grid grid-cols-7 gap-1 touch-pan-y"
            >
                {days.map((day, index) => {
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const hasTx = hasTransactions?.(day);

                    return (
                        <motion.button
                            key={index}
                            onClick={() => !dragging && isSelectable && onDateSelect(day)}
                            className={cn(
                                'relative flex flex-col items-center py-2.5 rounded-xl transition-all border-2',
                                isSelected
                                    ? 'bg-accent/10 border-accent border-3 text-accent shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                                    : 'border-transparent',
                                !isCurrentMonth && 'opacity-30',
                                isSelectable && 'hover:bg-muted/50'
                            )}
                            whileHover={isSelectable ? { scale: 1.05 } : {}}
                            whileTap={isSelectable ? { scale: 0.95 } : {}}
                        >
                            <span className={cn(
                                'text-base font-bold tracking-tight',
                                isSelected ? 'text-glow' : 'text-foreground'
                            )}>
                                {formatDate(day, 'd')}
                            </span>
                            {hasTx && (
                                <motion.span
                                    className={cn(
                                        'absolute bottom-1 w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]',
                                        isSelected ? 'bg-accent animate-pulse' : 'bg-muted-foreground/40'
                                    )}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </motion.div>

            {/* Visual Hint for Swipe or Clear Button */}
            {selectedDate ? (
                <motion.div
                    className="mt-3 flex items-center justify-center gap-2"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                        {formatDate(selectedDate, 'MMM dd')} {t('expenses.calendarSelected')}
                    </p>
                    <motion.button
                        onClick={() => selectedDate && onDateSelect(selectedDate)}
                        className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive/70 hover:text-destructive bg-destructive/5 hover:bg-destructive/10 rounded-full transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <X className="w-2.5 h-2.5" />
                        {t('expenses.clearDate')}
                    </motion.button>
                </motion.div>
            ) : (
                <div className="flex justify-between items-center mt-3 px-1 opacity-20 pointer-events-none">
                    <ChevronLeft className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">{t('expenses.calendarSwipeHint')}</span>
                    <ChevronRight className="w-3 h-3" />
                </div>
            )}
        </div>
    );
}
