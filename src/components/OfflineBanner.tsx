import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useOnline } from '@/hooks/useOnline';

/**
 * Slim bar shown while the device reports no connection.
 *
 * Covers the case a page-level error screen cannot: the user loaded the app fine, went
 * offline mid-session, and is now looking at stale data with nothing explaining why it
 * stopped updating.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const isOnline = useOnline();

  return (
    <AnimatePresence initial={false}>
      {!isOnline && (
        <motion.div
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{t('errors.offlineBanner')}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
