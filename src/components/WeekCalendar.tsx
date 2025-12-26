import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface WeekCalendarProps {
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  hasTransactions?: (date: Date) => boolean;
}

export function WeekCalendar({ currentDate, selectedDate, onDateSelect, hasTransactions }: WeekCalendarProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day, index) => {
        const isSelected = isSameDay(day, selectedDate);
        const hasTx = hasTransactions?.(day);

        return (
          <button
            key={index}
            onClick={() => onDateSelect(day)}
            className={cn(
              'flex flex-col items-center py-2 px-1 rounded-xl transition-all',
              isSelected
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted'
            )}
          >
            <span className="text-xs font-medium mb-1">
              {format(day, 'EEE').charAt(0)}
            </span>
            <span className={cn(
              'text-sm font-semibold',
              !isSelected && 'text-foreground'
            )}>
              {format(day, 'd')}
            </span>
            {hasTx && (
              <span className={cn(
                'w-1.5 h-1.5 rounded-full mt-1',
                isSelected ? 'bg-accent-foreground' : 'bg-accent'
              )} />
            )}
          </button>
        );
      })}
    </div>
  );
}
