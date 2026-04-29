import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, RotateCw, SlidersHorizontal } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface DateRangeSelectorProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  onExportCSV: () => void;
  minDate?: Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const presetRanges = [
  { label: 'Last 7 Days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 Days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'This Month', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last Month', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last 3 Months', getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: 'Last 6 Months', getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: 'This Year', getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

export function DateRangeSelector({
  dateRange,
  onDateRangeChange,
  onExportCSV,
  minDate,
  onRefresh,
  isRefreshing = false,
}: DateRangeSelectorProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const next = preset.getValue();

    if (minDate && isBefore(next.from, minDate)) {
      onDateRangeChange({
        from: minDate,
        to: isBefore(next.to, minDate) ? minDate : next.to,
      });
      return;
    }

    onDateRangeChange(next);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      if (minDate && isBefore(range.from, minDate)) {
        onDateRangeChange({
          from: minDate,
          to: isBefore(range.to, minDate) ? minDate : range.to,
        });
        return;
      }

      onDateRangeChange({ from: range.from, to: range.to });
    }
  };

  return (
    <motion.div
      className="flex items-center justify-between gap-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 px-2.5 sm:h-10 sm:px-3 gap-2 border-border/60 bg-card/50 hover:bg-accent/20 hover:border-accent/30 max-w-[140px] sm:max-w-[200px]">
            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs sm:text-sm font-medium truncate">
              {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton>
              <SlidersHorizontal className="w-4 h-4 text-violet-500" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border/60 shadow-lg">
            {presetRanges.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => handlePresetSelect(preset)}
                className="cursor-pointer hover:bg-accent/50 focus:bg-accent/50"
              >
                <span>{preset.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {onRefresh && (
          <IconButton onClick={onRefresh} disabled={isRefreshing}>
            <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </IconButton>
        )}

        <IconButton onClick={onExportCSV} className="text-emerald-500">
          <Download className="w-4 h-4" />
        </IconButton>
      </div>
    </motion.div>
  );
}
