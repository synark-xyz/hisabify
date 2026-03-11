import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, Download, Lock } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRange } from 'react-day-picker';

interface DateRangeSelectorProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  onExportCSV: () => void;
  minDate?: Date;
  onUpgradeRequired?: () => void;
  canUseCustomRange?: boolean;
  canExport?: boolean;
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
  onUpgradeRequired,
  canUseCustomRange = true,
  canExport = true,
}: DateRangeSelectorProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  const handlePresetSelect = (preset: typeof presetRanges[0]) => {
    const next = preset.getValue();

    if (!canUseCustomRange) {
      onUpgradeRequired?.();
      return;
    }

    if (minDate && isBefore(next.from, minDate)) {
      onUpgradeRequired?.();
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
      if (!canUseCustomRange) {
        onUpgradeRequired?.();
        return;
      }

      if (minDate && isBefore(range.from, minDate)) {
        onUpgradeRequired?.();
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
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Quick Select
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {presetRanges.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => handlePresetSelect(preset)}
              >
                <span className="flex items-center gap-2">
                  {preset.label}
                  {minDate && isBefore(preset.getValue().from, minDate) && <Lock className="w-3 h-3 text-amber-500" />}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <span className="text-sm">
                {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
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
      </div>

      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
          onClick={canExport ? onExportCSV : onUpgradeRequired}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          {canExport ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          {canExport ? 'Export CSV' : 'Export CSV (Pro)'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
