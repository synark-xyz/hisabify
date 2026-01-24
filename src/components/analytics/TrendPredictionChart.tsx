import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/useCurrency';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import type { TrendPrediction } from '@/hooks/useAdvancedAnalytics';

interface TrendPredictionChartProps {
  prediction: TrendPrediction;
}

export function TrendPredictionChart({ prediction }: TrendPredictionChartProps) {
  const { formatAmount } = useCurrency();

  const getTrendIcon = () => {
    switch (prediction.trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    switch (prediction.trend) {
      case 'increasing':
        return 'destructive';
      case 'decreasing':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const chartData = prediction.monthlyData.map(d => ({
    ...d,
    predicted: d.predicted || null,
  }));

  return (
    <Card className="bg-card shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Spending Forecast
          </CardTitle>
          <Badge variant={getTrendColor()} className="flex items-center gap-1">
            {getTrendIcon()}
            <span className="capitalize">{prediction.trend}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="p-3 rounded-xl bg-primary/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs text-muted-foreground">Next Month Prediction</p>
            <p className="text-lg font-bold text-foreground mt-1">
              {formatAmount(prediction.nextMonthExpenses)}
            </p>
          </motion.div>
          <motion.div
            className="p-3 rounded-xl bg-accent/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-xs text-muted-foreground">Confidence Level</p>
            <p className="text-lg font-bold text-foreground mt-1">
              {prediction.confidence.toFixed(0)}%
            </p>
          </motion.div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="month" 
                className="text-muted-foreground text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-muted-foreground text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatAmount(value),
                  name === 'actual' ? 'Actual' : 'Predicted'
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                name="Actual"
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2 }}
                name="Predicted"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Prediction based on linear regression analysis of your spending history
        </p>
      </CardContent>
    </Card>
  );
}
