import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import ReportsPage from '@/pages/ReportsPage';
import { cn } from '@/lib/utils';

export function InsightsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') ?? 'analytics';

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <div className="px-4 pt-2">
        {/* Desktop: centered with max-width; Mobile: full-width sticky */}
        <div className="flex justify-center">
          <TabsList className="grid w-auto grid-cols-2 min-w-[280px]">
            <TabsTrigger value="analytics">{t('analytics.title')}</TabsTrigger>
            <TabsTrigger value="reports">{t('reports.title')}</TabsTrigger>
          </TabsList>
        </div>
      </div>
      <TabsContent value="analytics" className="mt-0">
        <AnalyticsPage />
      </TabsContent>
      <TabsContent value="reports" className="mt-0 overflow-hidden">
        <ReportsPage />
      </TabsContent>
    </Tabs>
  );
}
