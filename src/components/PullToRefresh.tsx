import React, { ReactNode, forwardRef } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export const PullToRefresh = forwardRef<HTMLDivElement, PullToRefreshProps>(
  ({ children, className = '' }, ref) => {
    // Pull to refresh is temporarily disabled
    return (
      <div
        ref={ref}
        className={`relative overflow-y-auto ${className}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div >
    );
  }
);

PullToRefresh.displayName = 'PullToRefresh';