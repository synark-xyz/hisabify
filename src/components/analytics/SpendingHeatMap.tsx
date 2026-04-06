import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { format, startOfWeek, addDays, getDay, parseISO, startOfMonth, subMonths } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { HeatMapData } from '@/hooks/useAdvancedAnalytics';

interface SpendingHeatMapProps {
  data: HeatMapData[];
}

const intensityColors = [
  'bg-muted',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-400 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-600',
  'bg-emerald-600 dark:bg-emerald-500',
];

export function SpendingHeatMap({ data }: SpendingHeatMapProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();

  // Organize data into weeks
  const calendarData = useMemo(() => {
    const now = new Date();
    const startDate = subMonths(startOfMonth(now), 2);
    const weeks: HeatMapData[][] = [];
    
    // Create a map for quick lookup
    const dataMap = new Map(data.map(d => [d.date, d]));
    
    // Start from the beginning of the week containing startDate
    let currentDate = startOfWeek(startDate, { weekStartsOn: 0 });
    let currentWeek: HeatMapData[] = [];
    
    while (currentDate <= now) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      const dayData = dataMap.get(dateKey) || {
        date: dateKey,
        amount: 0,
        count: 0,
        intensity: 0,
      };
      
      currentWeek.push(dayData);
      
      if (getDay(currentDate) === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate = addDays(currentDate, 1);
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [data]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    
    calendarData.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const date = parseISO(firstDay.date);
        const month = date.getMonth();
        if (month !== lastMonth) {
          labels.push({ label: format(date, 'MMM'), weekIndex });
          lastMonth = month;
        }
      }
    });
    
    return labels;
  }, [calendarData]);

  return (
    <Card className="bg-card shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-foreground">
          {t('analytics.heatMap')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex mb-1 pl-8">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-xs text-muted-foreground"
                style={{ marginLeft: i === 0 ? m.weekIndex * 14 : (m.weekIndex - (monthLabels[i-1]?.weekIndex || 0)) * 14 - 24 }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 pr-1">
              {dayLabels.map((day, i) => (
                <div
                  key={day}
                  className="h-3 text-xs text-muted-foreground flex items-center"
                  style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <TooltipProvider>
              <div className="flex gap-0.5">
                {calendarData.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-0.5">
                    {week.map((day, dayIndex) => (
                      <Tooltip key={day.date}>
                        <TooltipTrigger asChild>
                          <motion.div
                            className={`w-3 h-3 rounded-sm cursor-pointer ${intensityColors[day.intensity]}`}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (weekIndex * 7 + dayIndex) * 0.002 }}
                            whileHover={{ scale: 1.3 }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">
                            {format(parseISO(day.date), 'MMM d, yyyy')}
                          </p>
                          <p>{day.count} {t('analytics.transactions')}</p>
                          <p>{formatAmount(day.amount)}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>{t('analytics.less')}</span>
          {intensityColors.map((color, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
          <span>{t('analytics.more')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
