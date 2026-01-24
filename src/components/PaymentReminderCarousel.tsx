import { motion } from 'framer-motion';
import { Clock, CheckCircle, WarningCircle, Calendar } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { PaymentReminder } from '@/types';
import { format, differenceInDays, isPast, isToday } from 'date-fns';

interface PaymentReminderCarouselProps {
  reminders: PaymentReminder[];
}

export function PaymentReminderCarousel({ reminders }: PaymentReminderCarouselProps) {
  const { formatAmount } = useCurrency();

  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-card/50 rounded-2xl border border-dashed border-muted-foreground/20">
        <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" weight="duotone" />
        <p className="text-sm font-medium text-muted-foreground">No reminder has been set yet</p>
      </div>
    );
  }

  const shouldAnimate = reminders.length > 2;
  // Duplicate reminders only if we are animating for seamless loop
  const displayReminders = shouldAnimate ? [...reminders, ...reminders, ...reminders] : reminders;

  const getReminderStatus = (reminder: PaymentReminder) => {
    const dueDate = new Date(reminder.due_date);
    const diff = differenceInDays(dueDate, new Date());

    if (reminder.status === 'paid') {
      return {
        label: 'Paid',
        icon: CheckCircle,
        color: 'text-emerald-500',
        borderColor: 'border-emerald-500/20',
        bgColor: 'bg-emerald-500/10',
      };
    }

    if (isPast(dueDate) && !isToday(dueDate)) {
      return {
        label: 'Overdue',
        icon: WarningCircle,
        color: 'text-rose-500',
        borderColor: 'border-rose-500/20',
        bgColor: 'bg-rose-500/10',
      };
    }

    if (diff <= 2) {
      return {
        label: `In ${diff === 0 ? 'today' : diff === 1 ? '1 day' : diff + ' days'}`,
        icon: Clock,
        color: 'text-orange-500',
        borderColor: 'border-orange-500/30',
        bgColor: 'bg-orange-500/15',
      };
    }

    return {
      label: format(dueDate, 'MMM dd'),
      icon: Calendar,
      color: 'text-blue-500',
      borderColor: 'border-blue-500/20',
      bgColor: 'bg-blue-500/10',
    };
  };

  return (
    <div className={cn(
      "relative overflow-x-auto custom-scrollbar py-2 -mx-4 px-4 mask-fade-edges",
      shouldAnimate ? "overflow-hidden" : ""
    )}>
      <motion.div
        className="flex gap-3 w-max"
        animate={shouldAnimate ? {
          x: [0, -100 / 3 + '%'],
        } : {}}
        transition={shouldAnimate ? {
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: reminders.length * 10,
            ease: 'linear',
          },
        } : {}}
      >
        {displayReminders.map((reminder, index) => {
          const status = getReminderStatus(reminder);
          const Icon = status.icon;

          return (
            <motion.div
              key={`${reminder.id}-${index}`}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl border bg-card/50 backdrop-blur-md shadow-sm min-w-[180px]',
                status.borderColor
              )}
              whileHover={{ scale: 1.02 }}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', status.bgColor)}>
                <Icon className={cn('w-5 h-5', status.color)} weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{reminder.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('text-[10px] font-bold tracking-wider', status.color)}>
                    {status.label}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-foreground">{formatAmount(reminder.amount)}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
