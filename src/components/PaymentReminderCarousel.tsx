import { motion } from 'framer-motion';
import { Clock, CheckCircle, WarningCircle, Calendar } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useLanguage, getLanguageLocale } from '@/hooks/useLanguage';
import { PaymentReminder } from '@/types';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { enUS, bn, ja } from 'date-fns/locale';
import { toReminderDisplayDate } from '@/lib/reminderDate';
import { formatReminderAmount } from '@/lib/reminderAmount';
import { getSavingsReminderLabel, isSavingsReminder } from '@/lib/savings';

interface PaymentReminderCarouselProps {
  reminders: PaymentReminder[];
}

function getDateFnsLocale(lang: string) {
  switch (lang) {
    case 'bn':
      return bn;
    case 'ja':
      return ja;
    default:
      return enUS;
  }
}

export function PaymentReminderCarousel({ reminders }: PaymentReminderCarouselProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const pendingReminders = reminders.filter((reminder) => {
    const status = reminder.status as string;
    return status === 'upcoming' || status === 'pending';
  });

  if (pendingReminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-card/50 rounded-2xl border border-dashed border-muted-foreground/20">
        <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" weight="duotone" />
        <p className="text-sm font-medium text-muted-foreground">{t('reminders.noRemindersYet')}</p>
      </div>
    );
  }

  const getReminderStatus = (reminder: PaymentReminder) => {
    const dueDate = toReminderDisplayDate(reminder.due_date);
    const diff = differenceInDays(dueDate, new Date());

    if (reminder.status === 'paid') {
      return {
        label: t('reminders.statusPaid'),
        icon: CheckCircle,
        color: 'text-emerald-500',
        borderColor: 'border-emerald-500/20',
        bgColor: 'bg-emerald-500/10',
      };
    }

    if (isPast(dueDate) && !isToday(dueDate)) {
      return {
        label: t('reminders.statusOverdue'),
        icon: WarningCircle,
        color: 'text-rose-500',
        borderColor: 'border-rose-500/20',
        bgColor: 'bg-rose-500/10',
      };
    }

    if (diff <= 2) {
      const locale = getLanguageLocale(language);
      let timeLabel: string;
      if (diff === 0) {
        timeLabel = t('reminders.statusDueToday');
      } else if (diff === 1) {
        timeLabel = t('reminders.statusInOneDay');
      } else {
        timeLabel = t('reminders.statusInDays', { count: diff });
      }
      return {
        label: timeLabel,
        icon: Clock,
        color: 'text-orange-500',
        borderColor: 'border-orange-500/30',
        bgColor: 'bg-orange-500/15',
      };
    }

    return {
      label: format(dueDate, 'MMM dd', { locale: getDateFnsLocale(language) }),
      icon: Calendar,
      color: 'text-blue-500',
      borderColor: 'border-blue-500/20',
      bgColor: 'bg-blue-500/10',
    };
  };

  return (
    // Plain swipeable strip. The previous marquee rendered every reminder three times
    // to fake a seamless loop, which read as duplicate entries in the list.
    <div className="relative overflow-x-auto custom-scrollbar py-2 -mx-4 px-4 mask-fade-edges">
      <div className="flex gap-3 w-max">
        {pendingReminders.map((reminder) => {
          const status = getReminderStatus(reminder);
          const Icon = status.icon;
          const savingsReminder = isSavingsReminder(reminder);
          const reminderTitle = savingsReminder
            ? getSavingsReminderLabel(reminder, formatAmount, t)
            : reminder.title;

          return (
            <motion.div
              key={reminder.id}
              role="button"
              tabIndex={0}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl border bg-card shadow-sm w-[160px] flex-shrink-0',
                savingsReminder ? 'border-emerald-500/20' : status.borderColor
              )}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                if (reminder.savings_goal_id) {
                  navigate(`/savings?goal=${reminder.savings_goal_id}&tab=manual`);
                }
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && reminder.savings_goal_id) {
                  event.preventDefault();
                  navigate(`/savings?goal=${reminder.savings_goal_id}&tab=manual`);
                }
              }}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', savingsReminder ? 'bg-emerald-500/15' : status.bgColor)}>
                <Icon className={cn('w-4 h-4', savingsReminder ? 'text-emerald-600' : status.color)} weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{reminderTitle}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('text-[10px] font-bold tracking-wider', savingsReminder ? 'text-emerald-600' : status.color)}>
                    {status.label}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
