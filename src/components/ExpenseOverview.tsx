import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';

interface ExpenseOverviewProps {
  totalSalary: number;
  totalExpense: number;
  cardLast4?: string;
}

export function ExpenseOverview({ totalSalary, totalExpense, cardLast4 = '1965' }: ExpenseOverviewProps) {
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
            ${totalSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </motion.p>
          
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded-lg">
              <CreditCard className="w-3 h-3 text-white/70" />
              <span className="text-white/70 text-xs">Bank Account</span>
            </div>
          </div>
          <p className="text-white/50 text-xs mt-1">•••• •••• {cardLast4}</p>
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
            ${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </motion.p>
          
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded-lg">
              <CreditCard className="w-3 h-3 text-white/70" />
              <span className="text-white/70 text-xs">Bank Account</span>
            </div>
          </div>
          <p className="text-white/50 text-xs mt-1">•••• •••• {cardLast4}</p>
        </div>
      </motion.div>
    </div>
  );
}
