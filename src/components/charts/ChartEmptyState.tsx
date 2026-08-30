import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ChartEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Shared empty state for charts. Recharts renders a blank axis frame when it has no
 * rows, so charts should swap in this component instead of an empty canvas. Height is
 * content-driven so cards shrink rather than reserving the full chart box.
 */
export function ChartEmptyState({ icon, title, description, actionLabel, onAction }: ChartEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-foreground font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm mt-1 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
