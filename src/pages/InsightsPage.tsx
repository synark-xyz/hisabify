import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import ReportsPage from '@/pages/ReportsPage';

export function InsightsPage() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') ?? 'analytics';

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <div className="px-4 pt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="analytics" className="mt-0">
        <AnalyticsPage />
      </TabsContent>
      <TabsContent value="reports" className="mt-0">
        <ReportsPage />
      </TabsContent>
    </Tabs>
  );
}
