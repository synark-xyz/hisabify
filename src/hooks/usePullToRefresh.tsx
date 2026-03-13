import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);

  const stateRef = useRef({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0
  });

  useEffect(() => {
    stateRef.current.isPulling = isPulling;
    stateRef.current.isRefreshing = isRefreshing;
    stateRef.current.pullDistance = pullDistance;
  }, [isPulling, isRefreshing, pullDistance]);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Find the scrolling parent
  useEffect(() => {
    if (!containerRef.current) return;
    let parent = containerRef.current.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollParentRef.current = parent;
        break;
      }
      parent = parent.parentElement;
    }
    if (!scrollParentRef.current) {
      scrollParentRef.current = document.getElementById('root') || document.body;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const scrollTarget = scrollParentRef.current;
    const scrollTop = scrollTarget ? scrollTarget.scrollTop : 0;
    
    // Allow a couple pixels of leeway for iOS bounce
    if (scrollTop <= 2) {
      startY.current = e.touches[0].clientY;
      if (!stateRef.current.isPulling && !stateRef.current.isRefreshing) {
        setIsPulling(true);
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const { isPulling, isRefreshing, pullDistance } = stateRef.current;
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    // Abort if scrolling up natively
    if (diff <= 0 && pullDistance === 0) {
      setIsPulling(false);
      return;
    }

    const scrollTarget = scrollParentRef.current;
    const scrollTop = scrollTarget ? scrollTarget.scrollTop : 0;

    if (diff > 0 && scrollTop <= 2) {
      if (e.cancelable) e.preventDefault();
      const distance = Math.min(diff * 0.5, maxPull);
      setPullDistance(distance);
    }
  }, [maxPull]);

  const handleTouchEnd = useCallback(async () => {
    const { isPulling, isRefreshing, pullDistance } = stateRef.current;
    if (!isPulling) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefreshRef.current();
      } finally {
        setIsRefreshing(false);
      }
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    // Keep touchmove non-passive so we can preventDefault
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min((pullDistance / threshold) * 100, 100);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    progress
  };
}