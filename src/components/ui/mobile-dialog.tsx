import * as React from "react";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./drawer";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

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

  return keyboardHeight;
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

const PARTIAL_HEIGHT = 0.65;
const FULL_HEIGHT = 0.92;

function calculateSnapPoints(keyboardHeight: number): number[] {
  const vh = window.innerHeight;
  const availableHeight = vh - keyboardHeight;
  
  const partial = Math.round((availableHeight * PARTIAL_HEIGHT) / vh * 100) / 100;
  const full = Math.round((availableHeight * FULL_HEIGHT) / vh * 100) / 100;
  
  return [partial, full];
}

/**
 * Smart dialog component that uses native-optimized UI on mobile platforms
 * - Mobile (Capacitor): Bottom sheet drawer with snap points for better native UX
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
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  const snapPoints = React.useMemo(
    () => calculateSnapPoints(keyboardHeight),
    [keyboardHeight]
  );

  React.useEffect(() => {
    if (!isNative || !open) return;

    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (scrollElement.scrollHeight <= scrollElement.clientHeight) return;
      
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      const scrollTop = scrollElement.scrollTop;
      const scrollHeight = scrollElement.scrollHeight;
      const clientHeight = scrollElement.clientHeight;

      if (deltaY < 0 && scrollTop > 0) {
        e.stopPropagation();
      }
      if (deltaY > 0 && scrollTop < scrollHeight - clientHeight) {
        e.stopPropagation();
      }
    };

    scrollElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    scrollElement.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      scrollElement.removeEventListener('touchstart', handleTouchStart);
      scrollElement.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isNative, open, keyboardHeight]);

  if (isNative) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        snapPoints={snapPoints}
        dismissible={true}
        shouldScaleBackground={false}
      >
        <DrawerContent
          ref={contentRef}
          className={cn("flex flex-col !rounded-b-none", className)}
          style={{
            height: '100dvh',
            maxHeight: '100dvh',
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
            className="flex-1 px-4 pt-2 pb-safe min-h-0"
            data-vaul-no-drag
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              paddingBottom: `calc(var(--keyboard-height, 0px) + env(safe-area-inset-bottom, 0px) + 16px)`,
            }}
          >
            {children}
          </div>

          {/* Fixed Footer - if provided */}
          {footer && (
            <div 
              className="flex-shrink-0 px-4 py-4 border-t border-border/50 bg-background" 
              data-vaul-no-drag
              style={{
                marginTop: 'auto',
                paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 16px)`,
              }}
            >
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

        <div className="overflow-x-hidden py-1">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
