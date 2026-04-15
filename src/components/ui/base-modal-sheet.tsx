import * as React from "react";
import { Sheet as ReactModalSheet, SheetRef } from "react-modal-sheet";
import { X } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

import { cn } from "@/lib/utils";

// Snap point constants (80% and 40% height)
const SNAP_POINTS = [0.8, 0.4];

function getSortedSnapPoints(points: number[]): number[] {
  const sorted = [...new Set([0, 1, ...points])].sort((a, b) => a - b);
  return sorted;
}

interface SheetContextValue {
  onOpenChange: (open: boolean) => void;
  snapToMax: () => void;
  snapToDefault: () => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('Sheet components must be used within BaseModalSheet');
  }
  return context;
}

interface BaseModalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  snapPoints?: number[];
}

export function BaseModalSheet({
  open,
  onOpenChange,
  children,
  className,
  snapPoints = SNAP_POINTS,
}: BaseModalSheetProps) {
  const sheetRef = React.useRef<SheetRef>(null);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const sortedSnapPoints = getSortedSnapPoints(snapPoints);

  // Index of the highest user-defined snap point (e.g. 0.8 → index 2 in [0,0.4,0.8,1])
  const defaultSnapIndex = sortedSnapPoints.indexOf(Math.max(...snapPoints));
  const maxSnapIndex = sortedSnapPoints.length - 1; // full-height index

  // Track the last snap index the user was at before keyboard opened
  const prevSnapIndexRef = React.useRef<number>(defaultSnapIndex);
  // Prevent onSnap from overwriting prevSnapIndex during programmatic snaps
  const isProgrammaticSnapRef = React.useRef(false);

  // Capacitor keyboard events (native Android/iOS)
  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const showListener = Keyboard.addListener('keyboardWillShow', ({ keyboardHeight: kh }) => {
      document.documentElement.style.setProperty('--keyboard-height', `${kh}px`);
      setKeyboardHeight(kh);

      if (open && sheetRef.current) {
        isProgrammaticSnapRef.current = true;
        sheetRef.current.snapTo(maxSnapIndex);
        setTimeout(() => { isProgrammaticSnapRef.current = false; }, 400);
      }
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      setKeyboardHeight(0);

      if (open && sheetRef.current) {
        isProgrammaticSnapRef.current = true;
        sheetRef.current.snapTo(prevSnapIndexRef.current);
        setTimeout(() => { isProgrammaticSnapRef.current = false; }, 400);
      }
    });

    return () => {
      showListener.then(l => l.remove());
      hideListener.then(l => l.remove());
    };
  }, [open, maxSnapIndex]);

  // visualViewport fallback for browsers (non-native)
  React.useEffect(() => {
    if (Capacitor.isNativePlatform() || !window.visualViewport) return;

    const onViewportResize = () => {
      const kh = Math.max(0, window.innerHeight - window.visualViewport!.height);
      document.documentElement.style.setProperty('--keyboard-height', `${kh}px`);
      setKeyboardHeight(kh);

      if (open && sheetRef.current) {
        if (kh > 0) {
          isProgrammaticSnapRef.current = true;
          sheetRef.current.snapTo(maxSnapIndex);
          setTimeout(() => { isProgrammaticSnapRef.current = false; }, 400);
        } else {
          isProgrammaticSnapRef.current = true;
          sheetRef.current.snapTo(prevSnapIndexRef.current);
          setTimeout(() => { isProgrammaticSnapRef.current = false; }, 400);
        }
      }
    };

    window.visualViewport.addEventListener('resize', onViewportResize);
    return () => window.visualViewport!.removeEventListener('resize', onViewportResize);
  }, [open, maxSnapIndex]);

  const snapToMax = React.useCallback(() => {
    if (sheetRef.current) {
      isProgrammaticSnapRef.current = true;
      sheetRef.current.snapTo(maxSnapIndex);
      setTimeout(() => { isProgrammaticSnapRef.current = false; }, 400);
    }
  }, [maxSnapIndex]);

  const snapToDefault = React.useCallback(() => {
    if (sheetRef.current) {
      isProgrammaticSnapRef.current = true;
      sheetRef.current.snapTo(prevSnapIndexRef.current);
      setTimeout(() => { isProgrammaticSnapRef.current = false; }, 400);
    }
  }, []);

  return (
    <SheetContext.Provider value={{ onOpenChange, snapToMax, snapToDefault }}>
      <ReactModalSheet
        ref={sheetRef}
        isOpen={open}
        onClose={() => onOpenChange(false)}
        snapPoints={sortedSnapPoints}
        initialSnap={defaultSnapIndex}
        onSnap={(index) => {
          if (!isProgrammaticSnapRef.current) {
            prevSnapIndexRef.current = index;
          }
        }}
        className={className}
        style={{
          '--keyboard-height': `${keyboardHeight}px`,
        } as React.CSSProperties}
      >
        {children}
      </ReactModalSheet>
    </SheetContext.Provider>
  );
}

// Sheet.Backdrop - Clickable backdrop to close modal
interface SheetBackdropProps {
  className?: string;
  onClick?: () => void;
}

const SheetBackdrop: React.FC<SheetBackdropProps> = ({ className, onClick }) => {
  return (
    <ReactModalSheet.Backdrop
      onTap={onClick}
      className={cn(
        "bg-black/70 backdrop-blur-sm",
        className
      )}
    />
  );
};

// Sheet.Container - Contains the sheet content
interface SheetContainerProps {
  children: React.ReactNode;
  className?: string;
}

const SheetContainer: React.FC<SheetContainerProps> = ({ children, className }) => {
  return (
    <ReactModalSheet.Container
      className={cn("text-card-foreground shadow-2xl rounded-t-3xl", className)}
      style={{ background: 'hsl(var(--card))' }}
    >
      {children}
    </ReactModalSheet.Container>
  );
};

// Sheet.Header - Drag handle and optional title area
interface SheetHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

const SheetHeader: React.FC<SheetHeaderProps> = ({ children, className }) => {
  return (
    <ReactModalSheet.Header className={cn("relative bg-card border-b border-border/50", className)}>
      <div className="flex justify-center pt-3 pb-0">
        <div className="w-[100px] h-[5px] rounded-full bg-muted-foreground/20" />
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="w-10" />
        {children}
        <div className="w-10" />
      </div>
    </ReactModalSheet.Header>
  );
};

// Sheet.Content - Main scrollable content area
interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
}

const SheetContent: React.FC<SheetContentProps> = ({
  children,
  className,
}) => {
  const { snapToMax, snapToDefault } = useSheetContext();
  const scrollTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // Only react when content is actually scrollable
    if (el.scrollHeight <= el.clientHeight) return;
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      if (el.scrollTop === 0) {
        snapToDefault();
      } else {
        snapToMax();
      }
    }, 80);
  };

  return (
    <ReactModalSheet.Content
      className={cn("bg-card", className)}
      unstyled
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        borderRadius: '0',
      }}
      disableDrag
    >
      <div
        className="flex-1 scrollbar-hide"
        style={{
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onScroll={handleScroll}
      >
        <div className="pb-4">
          {children}
        </div>
      </div>
    </ReactModalSheet.Content>
  );
};

// Sheet.Title - Sheet title
interface SheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

const SheetTitle: React.FC<SheetTitleProps> = ({ children, className }) => {
  return (
    <h2 className={cn("text-center font-bold text-lg", className)}>
      {children}
    </h2>
  );
};

// Sheet.Close - Close button using context
interface SheetCloseProps {
  className?: string;
}

const SheetClose: React.FC<SheetCloseProps> = ({ className }) => {
  const { onOpenChange } = useSheetContext();
  
  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className={cn(
        "absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full w-10 h-10",
        "flex items-center justify-center",
        "bg-destructive/10 hover:bg-destructive/20 text-destructive",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      aria-label="Close"
    >
      <X className="h-5 w-5" />
    </button>
  );
};

// Sheet.Footer - Fixed footer section
interface SheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

const SheetFooter: React.FC<SheetFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "flex-shrink-0 px-4 py-4 border-t border-border/50 bg-card",
        className
      )}
    >
      {children}
    </div>
  );
};

// Sheet.DragIndicator - The drag handle bar
interface SheetDragIndicatorProps {
  className?: string;
}

const SheetDragIndicator: React.FC<SheetDragIndicatorProps> = ({ className }) => {
  return (
    <ReactModalSheet.DragIndicator className={cn("w-12 h-1 bg-muted-foreground/30 rounded-full", className)} />
  );
};

// Sheet.Scroller - Wrapper for SheetContent for backward compatibility
interface SheetScrollerProps {
  children: React.ReactNode;
  className?: string;
}

const SheetScroller: React.FC<SheetScrollerProps> = ({ children, className }) => {
  return (
    <SheetContent className={className}>
      {children}
    </SheetContent>
  );
};

// Compound components attached to BaseModalSheet
BaseModalSheet.Backdrop = SheetBackdrop;
BaseModalSheet.Container = SheetContainer;
BaseModalSheet.Header = SheetHeader;
BaseModalSheet.Content = SheetContent;
BaseModalSheet.Scroller = SheetScroller;
BaseModalSheet.Title = SheetTitle;
BaseModalSheet.Close = SheetClose;
BaseModalSheet.Footer = SheetFooter;
BaseModalSheet.DragIndicator = SheetDragIndicator;

// Export individual components
export {
  SheetBackdrop,
  SheetContainer,
  SheetHeader,
  SheetContent,
  SheetScroller,
  SheetTitle,
  SheetClose,
  SheetFooter,
  SheetDragIndicator,
};