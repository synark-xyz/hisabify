import { motion } from 'framer-motion';
import { useCurrency } from '@/hooks/useCurrency';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { getTransactionCategoryName } from '@/lib/transactionUtils';

interface TopExpensesTableProps {
  transactions: Transaction[];
}

export function TopExpensesTable({ transactions }: TopExpensesTableProps) {
  const { formatAmount } = useCurrency();
  const { t } = useTranslation();

  // Get top 5 expenses sorted by amount
  const topExpenses = [...transactions]
    .filter(t => (t.type === 'expense' || t.type === 'lend' || t.type === 'owe') && !t.savings_goal_id)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  return (
    <motion.div
      className="bg-card rounded-2xl p-6 shadow-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-bold text-foreground mb-4">{t('dialogs.dashboard.topExpenses')}</h3>
      {topExpenses.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">{t('dialogs.dashboard.merchant')}</TableHead>
                <TableHead className="text-muted-foreground">{t('dialogs.dashboard.category')}</TableHead>
                <TableHead className="text-muted-foreground">{t('dialogs.dashboard.date')}</TableHead>
                <TableHead className="text-right text-muted-foreground">{t('dialogs.dashboard.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topExpenses.map((tx, index) => (
                <motion.tr
                  key={tx.id}
                  className="border-b border-border/50 last:border-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <TableCell className="font-medium text-foreground">
                    {tx.merchant}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ 
                        backgroundColor: `${tx.category?.color}20`,
                        color: tx.category?.color 
                      }}
                    >
                      {getTransactionCategoryName(tx) || t('transaction.categoryOther')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(tx.date), 'MMM dd')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {formatAmount(Number(tx.amount))}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8">
          <span className="text-4xl">📋</span>
          <p className="text-muted-foreground mt-2">{t('dialogs.dashboard.noExpensesYet')}</p>
        </div>
      )}
    </motion.div>
  );
}
