import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Trophy, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import type { Insight } from '@/hooks/useAdvancedAnalytics';

interface InsightsCardsProps {
  insights: Insight[];
}

export function InsightsCards({ insights }: InsightsCardsProps) {
  const { formatAmount } = useCurrency();

  const getIcon = (insight: Insight) => {
    switch (insight.type) {
      case 'comparison':
        return insight.trend === 'up' ? TrendingUp : TrendingDown;
      case 'alert':
        return AlertTriangle;
      case 'achievement':
        return Trophy;
      default:
        return BarChart3;
    }
  };

  const getIconColor = (insight: Insight) => {
    switch (insight.type) {
      case 'comparison':
        return insight.trend === 'up' ? 'text-destructive' : 'text-emerald-500';
      case 'alert':
        return 'text-amber-500';
      case 'achievement':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBgColor = (insight: Insight) => {
    switch (insight.type) {
      case 'comparison':
        return insight.trend === 'up' ? 'bg-destructive/10' : 'bg-emerald-500/10';
      case 'alert':
        return 'bg-amber-500/10';
      case 'achievement':
        return 'bg-primary/10';
      default:
        return 'bg-muted';
    }
  };

  if (insights.length === 0) {
    return (
      <Card className="bg-card shadow-card">
        <CardContent className="p-6 text-center">
          <span className="text-4xl mb-3 block">📊</span>
          <p className="text-muted-foreground">
            Add more transactions to see personalized insights
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {insights.map((insight, index) => {
        const Icon = getIcon(insight);

        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-card shadow-card h-full card-3d transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl ${getBgColor(insight)}`}>
                    <Icon className={`w-5 h-5 ${getIconColor(insight)} icon-glow`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{insight.icon}</span>
                      <h3 className="font-semibold text-foreground truncate text-glow">
                        {insight.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {insight.description}
                    </p>
                    {insight.value !== undefined && insight.type !== 'comparison' && (
                      <p className="text-lg font-bold text-foreground mt-2">
                        {insight.type === 'alert' && insight.id === 'biggest-expense'
                          ? formatAmount(insight.value)
                          : `${insight.value.toFixed(0)}${insight.id.includes('streak') ? ' days' : '%'}`}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
