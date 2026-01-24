import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CollapsibleCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export function CollapsibleCalendar({
  selectedDate,
  onDateChange,
  className,
}: CollapsibleCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);

  // Get week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get month days for expanded view
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  
  // Calculate the start of the first week (including days from previous month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleDateSelect = (date: Date) => {
    onDateChange(date);
    if (showFullCalendar) {
      setShowFullCalendar(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div
      className={cn('bg-card rounded-2xl shadow-card overflow-hidden', className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-foreground">
            {format(selectedDate, 'MMMM yyyy')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={showFullCalendar} onOpenChange={setShowFullCalendar}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <CalendarIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && handleDateSelect(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpand}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 p-4 pb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Week View (Always Visible) */}
      <div className="grid grid-cols-7 gap-1 px-4 pb-4">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <motion.button
              key={day.toISOString()}
              onClick={() => handleDateSelect(day)}
              className={cn(
                'relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all',
                'hover:bg-accent/10',
                isSelected && 'bg-accent text-white hover:bg-accent',
                isTodayDate && !isSelected && 'ring-2 ring-accent/30',
                !isSelected && 'text-foreground'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={cn(
                'text-sm font-semibold',
                isSelected && 'text-white'
              )}>
                {format(day, 'd')}
              </span>
              {isTodayDate && !isSelected && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Expanded Month View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50">
              <div className="grid grid-cols-7 gap-1 p-4">
                {monthDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const isCurrentMonth =
                    day.getMonth() === selectedDate.getMonth();

                  return (
                    <motion.button
                      key={day.toISOString()}
                      onClick={() => handleDateSelect(day)}
                      className={cn(
                        'relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all',
                        'hover:bg-accent/10',
                        isSelected && 'bg-accent text-white hover:bg-accent',
                        isTodayDate && !isSelected && 'ring-2 ring-accent/30',
                        !isCurrentMonth && 'text-muted-foreground/40',
                        isCurrentMonth && !isSelected && 'text-foreground'
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className={cn(
                        'text-sm font-medium',
                        isSelected && 'text-white font-semibold'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {isTodayDate && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Date Jump */}
      <div className="flex items-center justify-center gap-2 px-4 pb-4 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDateSelect(addDays(selectedDate, -7))}
          className="flex-1"
        >
          Previous Week
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDateSelect(new Date())}
          disabled={isToday(selectedDate)}
          className="flex-1"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDateSelect(addDays(selectedDate, 7))}
          className="flex-1"
        >
          Next Week
        </Button>
      </div>
    </motion.div>
  );
}
