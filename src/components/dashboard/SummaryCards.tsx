import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, HandCoins, HandCoinsIcon } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';

interface SummaryCardsProps {
  totalExpenses: number;
  totalIncome: number;
  netBalance: number;
  budgetRemaining: number;
}

export function SummaryCards({ totalExpenses, totalIncome, netBalance, budgetRemaining }: SummaryCardsProps) {
  const { formatAmount } = useCurrency();
  const { t } = useTranslation();
  const cards = [
    {
      title: t('analytics.totalExpenses'),
      amount: totalExpenses,
      icon: TrendingDown,
      iconBg: 'bg-destructive/20',
      iconColor: 'text-destructive',
    },
    {
      title: t('analytics.totalIncome'),
      amount: totalIncome,
      icon: TrendingUp,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-500',
    },
    {
      title: t('analytics.netBalance'),
      amount: netBalance,
      icon: Wallet,
      iconBg: netBalance >= 0 ? 'bg-primary/20' : 'bg-destructive/20',
      iconColor: netBalance >= 0 ? 'text-primary' : 'text-destructive',
    },
    {
      title: t('analytics.budgetRemaining'),
      amount: budgetRemaining,
      icon: HandCoinsIcon,
      iconBg: budgetRemaining >= 0 ? 'bg-accent/20' : 'bg-destructive/20',
      iconColor: budgetRemaining >= 0 ? 'text-accent' : 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            className="p-4 bg-card rounded-2xl shadow-card card-3d transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full ${card.iconBg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.iconColor} icon-glow`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
            <motion.p
              className="text-lg font-bold text-foreground text-glow"
              key={card.amount}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {formatAmount(card.amount)}
            </motion.p>
          </motion.div>
        );
      })}
    </div>
  );
}
