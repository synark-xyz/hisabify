import { motion } from 'framer-motion';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'upcoming' | 'paid' | 'missed';
}

interface PaymentReminderCarouselProps {
  reminders: PaymentReminder[];
}

const statusConfig = {
  upcoming: {
    icon: Clock,
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-500/30',
    label: 'Upcoming',
  },
  paid: {
    icon: CheckCircle2,
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/30',
    label: 'Paid',
  },
  missed: {
    icon: AlertCircle,
    bgColor: 'bg-destructive/20',
    textColor: 'text-destructive',
    borderColor: 'border-destructive/30',
    label: 'Missed',
  },
};

export function PaymentReminderCarousel({ reminders }: PaymentReminderCarouselProps) {
  if (reminders.length === 0) return null;

  // Duplicate reminders for seamless loop
  const duplicatedReminders = [...reminders, ...reminders];

  return (
    <div className="relative overflow-hidden py-2">
      <motion.div
        className="flex gap-3"
        animate={{
          x: [0, -50 * reminders.length * 4],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: reminders.length * 8,
            ease: 'linear',
          },
        }}
      >
        {duplicatedReminders.map((reminder, index) => {
          const config = statusConfig[reminder.status];
          const Icon = config.icon;
          
          return (
            <motion.div
              key={`${reminder.id}-${index}`}
              className={cn(
                'flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border bg-card',
                config.borderColor
              )}
              whileHover={{ scale: 1.02 }}
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', config.bgColor)}>
                <Icon className={cn('w-4 h-4', config.textColor)} />
              </div>
              <div className="min-w-max">
                <p className="text-sm font-medium text-foreground">{reminder.title}</p>
                <p className="text-xs text-muted-foreground">{reminder.dueDate}</p>
              </div>
              <div className="text-right min-w-max">
                <p className="text-sm font-bold text-foreground">${reminder.amount.toLocaleString()}</p>
                <span className={cn('text-xs font-medium', config.textColor)}>{config.label}</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      
      {/* Gradient overlays for fade effect */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}
