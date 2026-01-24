import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell,
  Tooltip, CartesianGrid, ReferenceDot, LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Lightbulb, PieChart, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  MonthlySpending,
  CategorySpending,
  AnalyticsInsight
} from '@/types';
import { format, startOfYear, endOfYear, subYears, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnhancedAnalyticsChartProps {
  selectedYear: number;
  selectedMonth?: string;
  onMonthSelect?: (month: string) => void;
}

export function EnhancedAnalyticsChart({
  selectedYear,
  selectedMonth,
  onMonthSelect
}: EnhancedAnalyticsChartProps) {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [quarterFilter, setQuarterFilter] = useState<'All' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('All');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [fullYearData, setFullYearData] = useState<MonthlySpending[]>([]);
  const [comparisonData, setComparisonData] = useState<MonthlySpending[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySpending[]>([]);

  // Sample data fallback for when DB is empty or for initial look
  const sampleData: MonthlySpending[] = useMemo(() => [
    { month: 'Jan', amount: 32000, year: 2024, comparisonAmount: 28000 },
    { month: 'Feb', amount: 29000, year: 2024, comparisonAmount: 31000 },
    { month: 'Mar', amount: 35000, year: 2024, comparisonAmount: 33000 },
    { month: 'Apr', amount: 31000, year: 2024, comparisonAmount: 30000 },
    { month: 'May', amount: 38000, year: 2024, comparisonAmount: 35000 },
    { month: 'Jun', amount: 42000, year: 2024, comparisonAmount: 38000 },
    { month: 'Jul', amount: 45000, year: 2024, comparisonAmount: 40000 },
    { month: 'Aug', amount: 41000, year: 2024, comparisonAmount: 43000 },
    { month: 'Sep', amount: 39000, year: 2024, comparisonAmount: 37000 },
    { month: 'Oct', amount: 44000, year: 2024, comparisonAmount: 41000 },
    { month: 'Nov', amount: 48000, year: 2024, comparisonAmount: 45000 },
    { month: 'Dec', amount: 52000, year: 2024, comparisonAmount: 46000 },
  ], []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedYear, user]);

  const fetchAnalyticsData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const start = startOfYear(new Date(selectedYear, 0, 1)).toISOString();
      const end = endOfYear(new Date(selectedYear, 11, 31)).toISOString();
      const prevStart = startOfYear(subYears(new Date(selectedYear, 0, 1), 1)).toISOString();
      const prevEnd = endOfYear(subYears(new Date(selectedYear, 11, 31), 1)).toISOString();

      // Fetch current year transactions
      const { data: currentTx } = await supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end);

      // Fetch previous year transactions for comparison
      const { data: prevTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', prevStart)
        .lte('date', prevEnd);

      // Process monthly data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const processedCurrent = monthNames.map((name, idx) => {
        const monthTx = currentTx?.filter(tx => new Date(tx.date).getMonth() === idx) || [];
        const amount = monthTx.reduce((sum, tx) => sum + Number(tx.amount), 0);

        // Find top category for this month
        const cats: Record<string, number> = {};
        monthTx.forEach(tx => {
          const name = tx.category?.name || 'Other';
          cats[name] = (cats[name] || 0) + Number(tx.amount);
        });
        const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0];

        return {
          month: name,
          amount,
          year: selectedYear,
          topCategory: topCat
        } as MonthlySpending;
      });

      const processedPrev = monthNames.map((name, idx) => {
        const amount = prevTx?.filter(tx => new Date(tx.date).getMonth() === idx)
          .reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;
        return { month: name, amount, year: selectedYear - 1 };
      });

      // Merge comparison data
      const finalData = processedCurrent.map((curr, idx) => ({
        ...curr,
        comparisonAmount: processedPrev[idx].amount
      }));

      setFullYearData(finalData.length > 0 && currentTx?.length ? finalData : sampleData);

      // Process Category Breakdown (Total for Year)
      const allCats: Record<string, { amount: number, color: string }> = {};
      currentTx?.forEach(tx => {
        const name = tx.category?.name || 'Other';
        const color = tx.category?.color || '#6B7280';
        if (!allCats[name]) allCats[name] = { amount: 0, color };
        allCats[name].amount += Number(tx.amount);
      });

      const totalYearSpending = currentTx?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 1;
      const breakdown = Object.entries(allCats)
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          color: data.color,
          percentage: (data.amount / totalYearSpending) * 100
        }))
        .sort((a, b) => b.amount - a.amount);

      setCategoryBreakdown(breakdown.length > 0 ? breakdown : [
        { name: 'Food & Dining', amount: 91200, percentage: 32, color: '#f97316' },
        { name: 'Transport', amount: 68400, percentage: 24, color: '#3b82f6' },
        { name: 'Shopping', amount: 51300, percentage: 18, color: '#a855f7' },
      ]);

    } catch (err) {
      console.error(err);
      setFullYearData(sampleData);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    switch (quarterFilter) {
      case 'Q1': return fullYearData.slice(0, 3);
      case 'Q2': return fullYearData.slice(3, 6);
      case 'Q3': return fullYearData.slice(6, 9);
      case 'Q4': return fullYearData.slice(9, 12);
      default: return fullYearData;
    }
  }, [fullYearData, quarterFilter]);

  // Calculations
  const metrics = useMemo(() => {
    const totalThisYear = fullYearData.reduce((sum, d) => sum + d.amount, 0);
    const totalLastYear = fullYearData.reduce((sum, d) => sum + (d.comparisonAmount || 0), 0);
    const yoyGrowth = totalLastYear > 0 ? ((totalThisYear - totalLastYear) / totalLastYear) * 100 : 0;

    const avgMonthly = totalThisYear / 12;
    const currentMonthData = fullYearData.find(d => d.month === format(new Date(), 'MMM'));
    const currentMonthAmount = currentMonthData?.amount || 0;
    const monthVsAvg = avgMonthly > 0 ? ((currentMonthAmount - avgMonthly) / avgMonthly) * 100 : 0;

    const topCat = categoryBreakdown[0] || { name: 'N/A', percentage: 0, amount: 0 };

    return {
      totalThisYear,
      yoyGrowth,
      avgMonthly,
      currentMonthAmount,
      monthVsAvg,
      topCat
    };
  }, [fullYearData, categoryBreakdown]);

  // Insight Generation Logic
  const insights = useMemo<AnalyticsInsight[]>(() => {
    const list: AnalyticsInsight[] = [];
    if (fullYearData.length === 0) return list;

    // 1. Highest spending month
    const sorted = [...fullYearData].sort((a, b) => b.amount - a.amount);
    const highest = sorted[0];
    if (highest.amount > 0) {
      list.push({
        icon: '💡',
        message: `${highest.month} is your highest spending month (${formatAmount(highest.amount)})`,
        type: 'info'
      });
    }

    // 2. Unusual spikes (>20% above average)
    if (metrics.currentMonthAmount > metrics.avgMonthly * 1.2) {
      list.push({
        icon: '⚠️',
        message: `This month's spending is unusually high (${metrics.monthVsAvg.toFixed(0)}% above average)`,
        type: 'warning'
      });
    }

    // 3. Category concentration
    if (metrics.topCat.percentage > 30) {
      list.push({
        icon: '🎯',
        message: `${metrics.topCat.name} dominates your spending (${metrics.topCat.percentage.toFixed(0)}% of total)`,
        type: 'info'
      });
    }

    return list.slice(0, 3);
  }, [fullYearData, metrics, formatAmount]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const diff = data.comparisonAmount > 0
        ? ((data.amount - data.comparisonAmount) / data.comparisonAmount) * 100
        : 0;

      return (
        <div className="bg-[#1a1a2e]/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-white/70">Spending:</span>
              <span className="text-sm font-bold text-white">{formatAmount(data.amount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-white/70">Top Category:</span>
              <span className="text-sm font-medium text-orange-400">{data.topCategory || 'N/A'}</span>
            </div>
            <div className="pt-1 mt-1 border-t border-white/5 flex justify-between gap-4">
              <span className="text-xs text-white/50">vs Last Year:</span>
              <span className={cn("text-xs font-bold", diff > 0 ? "text-rose-400" : "text-emerald-400")}>
                {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted/50 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-muted/50 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 2A. Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total This Year */}
        <motion.div
          className="bg-[#1a1a2e]/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col justify-between"
          whileHover={{ y: -2 }}
        >
          <span className="text-xs font-medium text-white/50 uppercase tracking-tight">Total This Year</span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-white">{formatAmount(metrics.totalThisYear)}</h3>
            <p className={cn("text-xs font-medium flex items-center gap-1 mt-0.5", metrics.yoyGrowth > 0 ? "text-rose-400" : "text-emerald-400")}>
              {metrics.yoyGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(metrics.yoyGrowth).toFixed(1)}% vs last year
            </p>
          </div>
        </motion.div>

        {/* Monthly Average */}
        <motion.div
          className="bg-[#1a1a2e]/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col justify-between"
          whileHover={{ y: -2 }}
        >
          <span className="text-xs font-medium text-white/50 uppercase tracking-tight">Monthly Average</span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-white">{formatAmount(metrics.avgMonthly)}</h3>
            <p className="text-xs text-white/60 mt-0.5">
              This month: <span className="font-bold text-white">{formatAmount(metrics.currentMonthAmount)}</span>
            </p>
          </div>
        </motion.div>

        {/* Top Category */}
        <motion.div
          className="bg-[#1a1a2e]/40 backdrop-blur-md border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col justify-between"
          whileHover={{ y: -2 }}
        >
          <span className="text-xs font-medium text-white/50 uppercase tracking-tight">Top Category</span>
          <div className="mt-1">
            <h3 className="text-xl font-bold text-orange-400">{metrics.topCat.name}</h3>
            <p className="text-xs text-white/60 mt-0.5">
              <span className="font-bold text-white">{metrics.topCat.percentage.toFixed(0)}%</span> of spending
            </p>
          </div>
        </motion.div>
      </div>

      {/* Main Chart Container */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 shadow-xl p-4 overflow-hidden">
        {/* Quarter Filter */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/5 p-1 rounded-full flex gap-1">
            {['All', 'Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
              <button
                key={q}
                onClick={() => setQuarterFilter(q as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                  quarterFilter === q
                    ? "bg-orange-500 text-white shadow-lg"
                    : "text-white/40 hover:text-white"
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700 }}
                dy={15}
                label={{ value: 'Month', position: 'bottom', offset: 10, fill: 'rgba(255,255,255,0.2)', fontWeight: 800, fontSize: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                tickFormatter={(val) => `¥${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
              />
              <Bar
                dataKey="amount"
                radius={[6, 6, 0, 0]}
                onClick={(data) => onMonthSelect?.(data.month)}
                className="cursor-pointer"
              >
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.month === selectedMonth ? 'url(#activeGradient)' : 'url(#barGradient)'}
                    fillOpacity={entry.month === selectedMonth ? 1 : 0.8}
                  />
                ))}
                {/* 2C. Comparison Dots */}
                {filteredData.map((entry, index) => (
                  <ReferenceDot
                    key={`dot-${index}`}
                    x={entry.month}
                    y={entry.comparisonAmount}
                    r={3}
                    fill="#9ca3af"
                    stroke="#1a1a2e"
                    strokeWidth={1}
                  />
                ))}
              </Bar>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2B. Insights Section */}
      <div className="bg-[#1a1a2e]/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-1">
          <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> Key Insights
        </h4>
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <span className="text-lg leading-none">{insight.icon}</span>
            <p className="text-sm text-white/80 leading-snug">{insight.message}</p>
          </motion.div>
        ))}
        {insights.length === 0 && (
          <p className="text-sm text-white/40 text-center py-4 italic">Add more data to see detailed insights</p>
        )}
      </div>

      {/* 2D. Category Breakdown Part */}
      <div className="bg-[#1a1a2e]/40 backdrop-blur-md border border-white/5 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
            <PieChart className="w-3.5 h-3.5 text-purple-400" /> Category Breakdown
          </h4>
          <button
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
          >
            {showAllCategories ? 'Show Less' : 'View all'}
          </button>
        </div>

        <div className="space-y-4">
          {(showAllCategories ? categoryBreakdown : categoryBreakdown.slice(0, 3)).map((cat, idx) => (
            <motion.div
              key={cat.name}
              className="space-y-1.5 cursor-pointer group"
              whileHover={{ scale: 1.01 }}
              layout
            >
              <div className="flex justify-between items-end text-sm">
                <span className="font-bold text-white/80 group-hover:text-white transition-colors">{cat.name}</span>
                <span className="font-mono text-white/50">{cat.percentage.toFixed(0)}% • {formatAmount(cat.amount)}</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${cat.percentage}%` }}
                  style={{ backgroundColor: cat.color }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
