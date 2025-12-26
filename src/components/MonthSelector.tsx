import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';

interface MonthSelectorProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function MonthSelector({ currentDate, onDateChange }: MonthSelectorProps) {
  const handlePrevMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <h3 className="text-lg font-semibold text-foreground">
        {format(currentDate, 'MMMM yyyy')}
      </h3>
      <Button variant="ghost" size="icon" onClick={handleNextMonth}>
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
