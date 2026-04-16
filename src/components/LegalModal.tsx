import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TermsContent, PrivacyContent } from '@/lib/legalContent';
import { useTranslation } from 'react-i18next';

export type LegalTab = 'terms' | 'privacy';

interface LegalModalProps {
  open: boolean;
  defaultTab?: LegalTab;
  onClose: () => void;
}

export function LegalModal({ open, defaultTab = 'terms', onClose }: LegalModalProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[92vw] p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base font-bold">{t('auth.privacy')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="flex flex-col min-h-0">
          <TabsList className="mx-5 mt-3 mb-0 grid grid-cols-2 h-9">
            <TabsTrigger value="terms"   className="text-xs">{t('auth.terms')}</TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs">{t('auth.privacyPolicy')}</TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="mt-0 flex-1 min-h-0">
            <ScrollArea className="h-[65vh] px-5 py-4">
              <TermsContent />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="privacy" className="mt-0 flex-1 min-h-0">
            <ScrollArea className="h-[65vh] px-5 py-4">
              <PrivacyContent />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
