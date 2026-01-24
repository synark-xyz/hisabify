import { motion } from 'framer-motion';
import { useCurrency } from '@/hooks/useCurrency';
import { Transaction } from '@/types';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TopExpensesTableProps {
  transactions: Transaction[];
}

export function TopExpensesTable({ transactions }: TopExpensesTableProps) {
  const { formatAmount } = useCurrency();

  // Get top 5 expenses sorted by amount
  const topExpenses = [...transactions]
    .filter(t => t.type === 'expense')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  return (
    <motion.div
      className="bg-card rounded-2xl p-6 shadow-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-bold text-foreground mb-4">Top 5 Expenses</h3>
      {topExpenses.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">Merchant</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-muted-foreground">Amount</TableHead>
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
                      {tx.category?.name || 'Other'}
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
          <p className="text-muted-foreground mt-2">No expenses yet</p>
        </div>
      )}
    </motion.div>
  );
}
