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
      className="bg-card/60 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-card card-3d transition-all"
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
          month: "space-y-3 w-full",
          caption: "flex justify-center pt-1 relative items-center mb-4",
          caption_label: "text-base font-bold text-foreground text-glow uppercase tracking-wider",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 bg-accent/5 p-0 opacity-70 hover:opacity-100 hover:bg-accent/10 hover:text-accent rounded-xl border border-transparent hover:border-accent/30"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex w-full mb-2",
          head_cell: "text-muted-foreground/60 rounded-md flex-1 font-black text-[10px] uppercase tracking-tighter py-1 text-center",
          row: "flex w-full mt-1.5",
          cell: cn(
            "flex-1 text-center text-sm p-0.5 relative",
            "focus-within:relative focus-within:z-20"
          ),
          day: cn(
            "h-10 w-full p-0 font-bold rounded-xl transition-all border border-transparent hover:bg-muted/50 hover:border-border/50",
            "aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected: cn(
            "bg-accent/10 text-accent border-accent text-glow shadow-[0_0_15px_rgba(249,115,22,0.3)]",
            "hover:bg-accent/20 hover:text-accent",
            "focus:bg-accent/10 focus:text-accent"
          ),
          day_today: "bg-primary/10 text-primary font-bold border-primary/30",
          day_outside: "text-muted-foreground/20 aria-selected:bg-accent/5 aria-selected:text-muted-foreground/30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-5 w-5" />,
          IconRight: () => <ChevronRight className="h-5 w-5" />,
          DayContent: CustomDayContent,
        }}
      />
      {selectedDate && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center mt-4 opacity-70">
          Showing expenses for {format(selectedDate, 'MMM dd')} • Tap to clear
        </p>
      )}
    </motion.div>
  );
}
