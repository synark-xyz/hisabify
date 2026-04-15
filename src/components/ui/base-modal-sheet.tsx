import * as React from "react";
import { Sheet as ReactModalSheet } from "react-modal-sheet";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

// Snap point constants (80% and 40% height)
const SNAP_POINTS = [0.8, 0.4];

function getSortedSnapPoints(points: number[]): number[] {
  const sorted = [...new Set([0, 1, ...points])].sort((a, b) => a - b);
  return sorted;
}

interface SheetContextValue {
  onOpenChange: (open: boolean) => void;
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
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const sortedSnapPoints = getSortedSnapPoints(snapPoints);

  React.useEffect(() => {
    const updateKeyboardHeight = () => {
      const height = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--keyboard-height')) || 0;
      setKeyboardHeight(height);
    };

    updateKeyboardHeight();

    const observer = new MutationObserver(updateKeyboardHeight);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    });

    window.addEventListener('resize', updateKeyboardHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateKeyboardHeight);
    };
  }, []);

  return (
    <SheetContext.Provider value={{ onOpenChange }}>
      <ReactModalSheet
        isOpen={open}
        onClose={() => onOpenChange(false)}
        snapPoints={sortedSnapPoints}
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
    <ReactModalSheet.Container className={cn("bg-card text-card-foreground", className)}>
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
      <div className="flex items-center justify-between px-4 py-3">
        <div className="w-10" />
        {children}
        <div className="w-10" />
      </div>
    </ReactModalSheet.Header>
  );
};

// Sheet.Content - Main scrollable content area with draggableAt support
interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
  draggableAt?: 'top' | 'both' | 'none';
}

const SheetContent: React.FC<SheetContentProps> = ({ 
  children, 
  className,
  draggableAt = 'top'
}) => {
  const [scrollHeight, setScrollHeight] = React.useState(0);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateScrollHeight = () => {
      if (contentRef.current) {
        setScrollHeight(contentRef.current.scrollHeight);
      }
    };

    updateScrollHeight();
    
    const timeout = setTimeout(updateScrollHeight, 100);
    window.addEventListener('resize', updateScrollHeight);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateScrollHeight);
    };
  }, [children]);

  return (
    <ReactModalSheet.Content 
      className={cn("bg-card", className)}
      unstyled
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      disableDrag={draggableAt === 'none' ? true : (draggableAt === 'top' ? ((args: { scrollPosition?: string }) => args.scrollPosition !== 'top') : undefined)}
    >
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto overscroll-y-contain scrollbar-hide"
        style={{ 
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          minHeight: '0px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
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
        "absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full w-10 h-10",
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
  draggableAt?: 'top' | 'both';
}

const SheetScroller: React.FC<SheetScrollerProps> = ({ 
  children, 
  className,
  draggableAt = 'top'
}) => {
  return (
    <SheetContent className={className} draggableAt={draggableAt}>
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