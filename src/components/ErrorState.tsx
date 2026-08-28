import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Home, Loader2, RefreshCw, SearchX, ServerCrash, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isRetryableVariant, toErrorVariant, type ErrorVariant } from '@/lib/errorState';
import { useOnline } from '@/hooks/useOnline';

interface VariantSpec {
  Icon: typeof WifiOff;
  /** Offline and 404 are not the user's fault, so they get the neutral badge, not the alarm. */
  tone: 'neutral' | 'destructive';
  titleKey: string;
  descriptionKey: string;
}

const VARIANTS: Record<ErrorVariant, VariantSpec> = {
  offline: {
    Icon: WifiOff,
    tone: 'neutral',
    titleKey: 'errors.offlineTitle',
    descriptionKey: 'errors.offlineDescription',
  },
  server: {
    Icon: ServerCrash,
    tone: 'destructive',
    titleKey: 'errors.serverTitle',
    descriptionKey: 'errors.serverDescription',
  },
  notFound: {
    Icon: SearchX,
    tone: 'neutral',
    // Deliberately resource-neutral: this variant covers a missing transaction as well as
    // a bad URL. The 404 route passes its own page-specific copy.
    titleKey: 'errors.notFoundTitle',
    descriptionKey: 'errors.notFoundDescription',
  },
  generic: {
    Icon: AlertTriangle,
    tone: 'destructive',
    titleKey: 'errors.genericTitle',
    descriptionKey: 'errors.genericDescription',
  },
};

export interface ErrorStateProps {
  variant?: ErrorVariant;
  /** Omit to hide the retry button. May return a promise; the button stays busy until it settles. */
  onRetry?: () => void | Promise<unknown>;
  /** Omit to hide the home button. */
  onGoHome?: () => void;
  /** Cover the viewport instead of sitting inside a page's content area. */
  fullScreen?: boolean;
  /** Overrides the variant's title copy. Pass a translated string, not a key. */
  title?: string;
  /** Overrides the variant's description copy. Pass a translated string, not a key. */
  description?: string;
  /** Technical detail, rendered in development only. */
  detail?: string;
  className?: string;
}

/**
 * The one error/empty block in the app.
 *
 * Extracted from the markup that used to live inline in `ErrorBoundary`, so the boundary,
 * the 404 page and every page-level fetch failure look like the same product. Anything that
 * needs an error affordance should render this rather than hand-rolling another centred div.
 */
export function ErrorState({
  variant = 'generic',
  onRetry,
  onGoHome,
  fullScreen = false,
  title,
  description,
  detail,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [retrying, setRetrying] = useState(false);

  const { Icon, tone, titleKey, descriptionKey } = VARIANTS[variant];
  const showRetry = Boolean(onRetry) && isRetryableVariant(variant);

  const handleRetry = useCallback(async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      // The component is often unmounted by a successful retry; guarding with a mounted ref
      // would be noise, so we simply accept the no-op setState React 18 already tolerates.
      setRetrying(false);
    }
  }, [onRetry, retrying]);

  return (
    <motion.div
      role="alert"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        fullScreen ? 'min-h-screen bg-background' : 'py-16',
        className,
      )}
    >
      <div
        className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center mb-5',
          tone === 'destructive' ? 'bg-destructive/10' : 'bg-muted/40',
        )}
      >
        <Icon
          className={cn('w-10 h-10', tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground')}
          aria-hidden="true"
        />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">{title ?? t(titleKey)}</h2>
      <p className="text-muted-foreground max-w-sm">{description ?? t(descriptionKey)}</p>

      {import.meta.env.DEV && detail && (
        <pre className="mt-4 max-w-full overflow-auto rounded-lg bg-muted p-3 text-left text-xs text-destructive whitespace-pre-wrap">
          {detail}
        </pre>
      )}

      {(showRetry || onGoHome) && (
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          {onGoHome && (
            <Button variant="outline" onClick={onGoHome} className="gap-2">
              <Home className="w-4 h-4" />
              {t('errors.goHome')}
            </Button>
          )}
          {showRetry && (
            <Button onClick={handleRetry} disabled={retrying} className="gap-2">
              {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {retrying ? t('errors.retrying') : t('errors.retry')}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/**
 * The page-level case: "this screen's data failed to load".
 *
 * Does the classification itself (connectivity + error shape) so the ~10 call sites don't
 * each repeat `useOnline()` + `toErrorVariant()`. Pages should reach for this; reach for
 * `ErrorState` directly only when the variant is already known (the 404 route, the boundary).
 */
export function DataErrorState({
  error,
  onRetry,
  fullScreen,
  className,
}: {
  error: unknown;
  onRetry?: () => void | Promise<unknown>;
  fullScreen?: boolean;
  className?: string;
}) {
  const isOnline = useOnline();
  const variant = toErrorVariant(error, isOnline);

  return (
    <ErrorState
      variant={variant}
      onRetry={onRetry}
      fullScreen={fullScreen}
      className={className}
      detail={error instanceof Error ? error.message : typeof error === 'string' ? error : undefined}
    />
  );
}
