import { motion } from 'framer-motion';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { DayPicker, DayContentProps } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

interface MonthCalendarProps {
  currentDate: Date;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  hasTransactions?: (date: Date) => boolean;
}

export function MonthCalendar({ 
  currentDate, 
  selectedDate, 
  onDateSelect, 
  onMonthChange,
  hasTransactions 
}: MonthCalendarProps) {
  
  // Custom day content to show transaction indicators
  const CustomDayContent = (props: DayContentProps) => {
    const { date, activeModifiers } = props;
    const hasTx = hasTransactions?.(date);
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
    const isCurrentMonth = isSameMonth(date, currentDate);
    
    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        <span>{format(date, 'd')}</span>
        {hasTx && isCurrentMonth && (
          <span
            className={cn(
              'absolute bottom-0 w-1.5 h-1.5 rounded-full',
              isSelected ? 'bg-primary-foreground' : 'bg-accent'
            )}
          />
        )}
      </div>
    );
  };

  return (
    <motion.div 
      className="bg-card rounded-2xl p-3 shadow-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <DayPicker
        mode="single"
        selected={selectedDate || undefined}
        onSelect={(date) => date && onDateSelect(date)}
        month={currentDate}
        onMonthChange={onMonthChange}
        showOutsideDays={true}
        className={cn("p-0 pointer-events-auto w-full")}
        classNames={{
          months: "flex flex-col w-full",
          month: "space-y-2 w-full",
          caption: "flex justify-center pt-1 relative items-center mb-2",
          caption_label: "text-base font-semibold text-foreground",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-muted"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex w-full",
          head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-xs py-2 text-center",
          row: "flex w-full mt-1",
          cell: cn(
            "flex-1 text-center text-sm p-0.5 relative",
            "[&:has([aria-selected])]:bg-accent/20 [&:has([aria-selected])]:rounded-lg",
            "focus-within:relative focus-within:z-20"
          ),
          day: cn(
            "h-10 w-full p-0 font-normal rounded-lg transition-colors",
            "hover:bg-muted focus:bg-muted",
            "aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected: cn(
            "bg-primary text-primary-foreground",
            "hover:bg-primary hover:text-primary-foreground",
            "focus:bg-primary focus:text-primary-foreground"
          ),
          day_today: "bg-accent/30 text-accent-foreground font-semibold",
          day_outside: "text-muted-foreground/40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
          DayContent: CustomDayContent,
        }}
      />
      {selectedDate && (
        <p className="text-xs text-muted-foreground text-center mt-2 pb-1">
          Showing expenses for {format(selectedDate, 'MMM dd, yyyy')} • Tap again to clear
        </p>
      )}
    </motion.div>
  );
}
