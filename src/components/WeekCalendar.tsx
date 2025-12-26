import { motion } from 'framer-motion';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeekCalendarProps {
  currentDate: Date;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  hasTransactions?: (date: Date) => boolean;
}

export function WeekCalendar({ currentDate, selectedDate, onDateSelect, hasTransactions }: WeekCalendarProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="bg-card rounded-2xl p-4 shadow-card">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const hasTx = hasTransactions?.(day);

          return (
            <motion.button
              key={index}
              onClick={() => onDateSelect(day)}
              className={cn(
                'relative flex flex-col items-center py-3 rounded-xl transition-all',
                isSelected
                  ? 'bg-accent text-white'
                  : 'hover:bg-muted'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={cn(
                'text-base font-semibold',
                !isSelected && 'text-foreground'
              )}>
                {format(day, 'd')}
              </span>
              {hasTx && (
                <motion.span
                  className={cn(
                    'absolute bottom-1.5 w-1.5 h-1.5 rounded-full',
                    isSelected ? 'bg-white' : 'bg-accent'
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
