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
        className="relative p-4 rounded-2xl bg-gradient-to-br from-[#5B4B8A] via-[#7B6BA8] to-[#8B7BB8] shadow-lg overflow-hidden"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-xs font-medium">Total Salary</span>
            <button className="text-white/50">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
          </div>
          <motion.p
            className="text-white text-xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {formatAmount(totalSalary)}
          </motion.p>
          
          {totalSalary === 0 && (
            <p className="text-white/60 text-xs mt-2">Add income transactions to track</p>
          )}
        </div>
      </motion.div>

      {/* Expense Card */}
      <motion.div
        className="relative p-4 rounded-2xl bg-gradient-to-br from-accent via-orange-400 to-amber-400 shadow-lg overflow-hidden"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-xs font-medium">Total Expense</span>
            <button className="text-white/50">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
          </div>
          <motion.p
            className="text-white text-xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            {formatAmount(totalExpense)}
          </motion.p>
          
          {totalExpense === 0 && (
            <p className="text-white/60 text-xs mt-2">No expenses this period</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
