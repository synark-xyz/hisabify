import { Calculator, CreditCard, Percent, ArrowRightLeft, Tag, Handshake, Clock, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const iconMap = { Calculator, CreditCard, Percent, ArrowRightLeft, Tag, Handshake, Clock, Repeat };

export function MorePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const tools = [
    { id: 'calculator', icon: 'Calculator', label: t('morePage.calculator'), description: t('morePage.basicCalculations'), path: '/more/calculator' },
    { id: 'loan', icon: 'CreditCard', label: t('morePage.loanCalculator'), description: t('morePage.emiInterest'), path: '/more/loan' },
    { id: 'discount', icon: 'Percent', label: t('morePage.discountTax'), description: t('morePage.priceCalculations'), path: '/more/discount' },
    { id: 'currency', icon: 'ArrowRightLeft', label: t('morePage.currencyConverter'), description: t('morePage.liveExchangeRates'), path: '/more/currency' },
  ];

  const appPreferences = [
    { id: 'categories', icon: 'Tag', label: t('morePage.categories'), description: t('morePage.manageCategories'), path: '/categories', color: 'bg-primary/10 text-primary' },
  ];

  const financeTracking = [
    { id: 'recurring', icon: 'Repeat', label: t('recurring.title'), description: t('recurring.subtitle'), path: '/more/recurring', color: 'bg-emerald-500/10 text-emerald-500' },
    { id: 'debts', icon: 'Handshake', label: t('morePage.debtTracker'), description: t('morePage.trackDebts'), path: '/debts', color: 'bg-rose-500/10 text-rose-500' },
    { id: 'activity', icon: 'Clock', label: t('morePage.activityHistory'), description: t('morePage.viewActivity'), path: '/activity', color: 'bg-purple-500/10 text-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* /more is a tab — Layout renders the landing Header. No bar here. */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Tools Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('morePage.tools')}</h2>
          <div className="grid grid-cols-1 gap-3">
            {tools.map((tool) => {
              const Icon = iconMap[tool.icon as keyof typeof iconMap];
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

        {/* App Preferences Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('morePage.appPreferences')}</h2>
          <div className="grid grid-cols-1 gap-3">
            {appPreferences.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border border-border/50',
                    'bg-card hover:bg-accent/5 transition-colors text-left'
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', item.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Finance Tracking Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">{t('morePage.financeTracking')}</h2>
          <div className="grid grid-cols-1 gap-3">
            {financeTracking.map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border border-border/50',
                    'bg-card hover:bg-accent/5 transition-colors text-left'
                  )}
                >
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', item.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
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
