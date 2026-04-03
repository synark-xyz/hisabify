import { Calculator, CreditCard, Percent, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tools = [
  {
    id: 'calculator',
    icon: Calculator,
    label: 'Calculator',
    description: 'Basic calculations',
    path: '/more/calculator',
  },
  {
    id: 'loan',
    icon: CreditCard,
    label: 'Loan Calculator',
    description: 'EMI & interest',
    path: '/more/loan',
  },
  {
    id: 'discount',
    icon: Percent,
    label: 'Discount & Tax',
    description: 'Price calculations',
    path: '/more/discount',
  },
  {
    id: 'currency',
    icon: ArrowRightLeft,
    label: 'Currency Converter',
    description: 'Live exchange rates',
    path: '/more/currency',
  },
];

export function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/30"/>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Tools Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Tools</h2>
          <div className="grid grid-cols-1 gap-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => navigate(tool.path)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border border-border/50',
                    'bg-card hover:bg-accent/5 transition-colors text-left'
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{tool.label}</p>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
