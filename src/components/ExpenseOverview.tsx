import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface ExpenseOverviewProps {
  totalSalary: number;
  totalExpense: number;
}

export function ExpenseOverview({ totalSalary, totalExpense }: ExpenseOverviewProps) {
  const { formatAmount } = useCurrency();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Salary Card */}
      <motion.div
        className="relative p-5 rounded-2xl bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] border border-indigo-500/30 shadow-xl overflow-hidden card-3d"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.2),transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-200/70 text-xs font-bold uppercase tracking-wider">Total Salary</span>
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
          </div>
          <motion.p
            className="text-white text-2xl font-bold tracking-tight text-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {formatAmount(totalSalary)}
          </motion.p>

          {totalSalary === 0 && (
            <p className="text-white/40 text-[10px] mt-2 font-medium">Add income to start tracking</p>
          )}
        </div>
      </motion.div>

      {/* Expense Card */}
      <motion.div
        className="relative p-5 rounded-2xl bg-gradient-to-br from-[#450a0a] via-[#7f1d1d] to-[#991b1b] border border-rose-500/30 shadow-xl overflow-hidden card-3d"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.2),transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-rose-200/70 text-xs font-bold uppercase tracking-wider">Total Outgoings</span>
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
          </div>
          <motion.p
            className="text-white text-2xl font-bold tracking-tight text-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            {formatAmount(totalExpense)}
          </motion.p>

          {totalExpense === 0 && (
            <p className="text-white/40 text-[10px] mt-2 font-medium">No expenses recorded yet</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
