import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { HeadphonesIcon, Loader2, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface CustomerCenterTriggerProps {
  className?: string;
  variant?: 'button' | 'row';
}

export function CustomerCenterTrigger({ className, variant = 'button' }: CustomerCenterTriggerProps) {
  const { t } = useTranslation();
  const { showCustomerCenter } = useSubscription();
  const [loading, setLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const handlePress = async () => {
    if (!isNative) {
      window.open('mailto:support@hisabify.app?subject=Subscription%20Help', '_blank');
      return;
    }
    setLoading(true);
    try {
      await showCustomerCenter();
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'row') {
    return (
      <button
        onClick={handlePress}
        disabled={loading}
        className={cn(
          'w-full flex items-center justify-between py-3 px-0 text-left',
          'disabled:opacity-50',
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            {loading ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <HeadphonesIcon className="w-4 h-4 text-blue-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t('profilePersonal.manageSubscription')}</p>
            <p className="text-xs text-muted-foreground">
              {isNative ? t('profilePersonal.cancelChangePlanHelp') : t('profilePersonal.contactSupportHelp')}
            </p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      className={cn('gap-2', className)}
      onClick={handlePress}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <HeadphonesIcon className="w-4 h-4" />
      )}
      {isNative ? t('profilePersonal.manageSubscription') : t('profilePersonal.contactSupport')}
    </Button>
  );
}
