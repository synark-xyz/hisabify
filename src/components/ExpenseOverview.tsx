import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/hooks/useCurrency';

interface ExpenseOverviewProps {
  totalSalary: number;
  totalExpense: number;
}

export function ExpenseOverview({ totalSalary, totalExpense }: ExpenseOverviewProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Income Card */}
      <motion.div
        className="relative p-5 rounded-2xl bg-gradient-to-br from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 border border-green-500/30 shadow-xl overflow-hidden"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.2),transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">{t('analytics.totalIncome')}</span>
            <div className="w-2 h-2 rounded-full bg-green-300 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          </div>
          <motion.p
            className="text-white text-2xl font-bold tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {formatAmount(totalSalary)}
          </motion.p>

          {totalSalary === 0 && (
            <p className="text-white/60 text-[10px] mt-2 font-medium">{t('analytics.dialogs.dashboard.addIncomeStart')}</p>
          )}
        </div>
      </motion.div>

      {/* Expense Card */}
      <motion.div
        className="relative p-5 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 dark:from-red-700 dark:to-red-800 border border-red-500/30 shadow-xl overflow-hidden"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.2),transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">{t('analytics.totalExpenses')}</span>
            <div className="w-2 h-2 rounded-full bg-red-300 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          </div>
          <motion.p
            className="text-white text-2xl font-bold tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            {formatAmount(totalExpense)}
          </motion.p>

          {totalExpense === 0 && (
            <p className="text-white/60 text-[10px] mt-2 font-medium">{t('analytics.dialogs.dashboard.noExpensesRecorded')}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
