import { motion } from 'framer-motion';
import { Mic, Camera, Edit, Sparkles } from 'lucide-react';
import { ResponsiveDrawer } from '@/components/ui/responsive-drawer';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

interface InputMethodSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoice: () => void;
  onReceipt: () => void;
  onManual: () => void;
}

export function InputMethodSheet({
  open,
  onOpenChange,
  onVoice,
  onReceipt,
  onManual
}: InputMethodSheetProps) {
  const { isPremium } = useSubscription();

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Choose Input Method"
    >
      <p className="text-center text-sm text-muted-foreground mb-4">
        Select how you'd like to add your transaction
      </p>

      <div className="grid grid-cols-3 gap-4">
        {/* Voice Memo Card */}
        <ActionCard
          icon={Mic}
          label="Voice"
          description="Quick capture"
          onClick={onVoice}
          isPremium={isPremium}
          showPremiumBadge={false}
        />

        {/* Receipt Scanner Card */}
        <ActionCard
          icon={Camera}
          label="Scan"
          description="Extract from image"
          onClick={onReceipt}
          isPremium={isPremium}
          showPremiumBadge={false}
        />

        {/* Manual Entry Card */}
        <ActionCard
          icon={Edit}
          label="Manual"
          description="Traditional form"
          onClick={onManual}
          isPremium={isPremium}
          showPremiumBadge={false}
        />
      </div>
    </ResponsiveDrawer>
  );
}

interface ActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  isPremium: boolean;
  showPremiumBadge?: boolean;
}

function ActionCard({
  icon: Icon,
  label,
  description,
  onClick,
  isPremium,
  showPremiumBadge = false
}: ActionCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200",
        "hover:border-accent hover:bg-accent/5 hover:shadow-lg",
        "active:scale-95",
        "border-border bg-card"
      )}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Premium Badge (for future use) */}
      {showPremiumBadge && isPremium && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
          <Sparkles className="w-2.5 h-2.5" />
          PRO
        </div>
      )}

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-accent" />
      </div>

      {/* Label */}
      <div className="text-center">
        <div className="font-bold text-sm text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
          {description}
        </div>
      </div>
    </motion.button>
  );
}
