import * as React from "react";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./drawer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom hook to prevent drawer drag interference with scrolling
function useScrollableDrawer() {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = React.useState(false);

  React.useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    let touchStartY = 0;
    let scrollStartTop = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      scrollStartTop = scrollElement.scrollTop;
      setIsScrolling(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      // Prevent drawer drag when scrolling content
      if (scrollElement.scrollHeight > scrollElement.clientHeight) {
        const scrollTop = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight;
        const clientHeight = scrollElement.clientHeight;

        // Allow scroll up if not at top
        if (deltaY < 0 && scrollTop > 0) {
          e.stopPropagation();
        }
        // Allow scroll down if not at bottom
        if (deltaY > 0 && scrollTop < scrollHeight - clientHeight) {
          e.stopPropagation();
        }
      }
    };

    const handleTouchEnd = () => {
      setIsScrolling(false);
    };

    scrollElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollElement.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      scrollElement.removeEventListener('touchstart', handleTouchStart);
      scrollElement.removeEventListener('touchmove', handleTouchMove);
      scrollElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return { scrollRef, isScrolling };
}

interface MobileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

/**
 * Smart dialog component that uses native-optimized UI on mobile platforms
 * - Mobile (Capacitor): Bottom sheet drawer for better native UX
 * - Web: Centered dialog popup
 */
export function MobileDialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
  maxWidth = "max-w-[500px]",
}: MobileDialogProps) {
  const isNative = Capacitor.isNativePlatform();
  const { scrollRef } = useScrollableDrawer();

  if (isNative) {
    // Use bottom sheet for native mobile apps
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible={true}
        shouldScaleBackground={false}
      >
        <DrawerContent
          className={cn("flex flex-col", className)}
          style={{
            maxHeight: 'calc(100vh - 5rem)', // 100vh - bottom nav height (80px/5rem)
          }}
        >
          {/* Fixed Header - Draggable area */}
          <div className="flex-shrink-0">
            <div className="absolute right-4 top-4 z-10">
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-full w-8 h-8 flex items-center justify-center bg-destructive/90 text-white hover:bg-destructive transition-colors"
                data-vaul-no-drag
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <DrawerHeader className="pt-6 pr-12 pb-4">
              <DrawerTitle className="text-center font-bold text-xl">
                {title}
              </DrawerTitle>
            </DrawerHeader>
          </div>

          {/* Scrollable Content - Prevent drawer drag on this area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 min-h-0"
            data-vaul-no-drag
            style={{
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y'
            }}
          >
            {children}
          </div>

          {/* Fixed Footer - if provided */}
          {footer && (
            <div className="flex-shrink-0 px-4 py-4 border-t border-border/50 bg-background" data-vaul-no-drag>
              {footer}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  // Use centered dialog for web
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidth, className)}>
        <DialogHeader className="pr-8">
          <DialogTitle className="text-center font-bold text-xl">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-x-hidden">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
