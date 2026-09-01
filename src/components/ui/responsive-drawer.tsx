import * as React from "react";
import { Capacitor } from "@capacitor/core";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "./drawer";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ResponsiveDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

const PARTIAL_HEIGHT = 0.5;
const FULL_HEIGHT = 0.9;

function calculateSnapPoints(keyboardHeight: number): number[] {
  const vh = window.innerHeight;
  const availableHeight = vh - keyboardHeight;
  
  const partial = Math.round((availableHeight * PARTIAL_HEIGHT) / vh * 100) / 100;
  const full = Math.round((availableHeight * FULL_HEIGHT) / vh * 100) / 100;
  
  return [partial, full];
}

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

function useNativeKeyboardListener() {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleKeyboardShow = (e: Event) => {
      const ke = e as KeyboardEvent & { keybaordHeight?: number; keybaord?: { height: number } };
      const height = ke.keyboardHeight || (ke as { keybaord?: { height: number } }).keybaord?.height || 0;
      if (height > 0) {
        setKeyboardHeight(height);
        setIsKeyboardVisible(true);
        document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
      }
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };

    window.addEventListener('keyboardWillShow', handleKeyboardShow as EventListener);
    window.addEventListener('keyboardWillHide', handleKeyboardHide);
    window.addEventListener('keyboardDidShow', handleKeyboardShow as EventListener);
    window.addEventListener('keyboardDidHide', handleKeyboardHide);

    return () => {
      window.removeEventListener('keyboardWillShow', handleKeyboardShow as EventListener);
      window.removeEventListener('keyboardWillHide', handleKeyboardHide);
      window.removeEventListener('keyboardDidShow', handleKeyboardShow as EventListener);
      window.removeEventListener('keyboardDidHide', handleKeyboardHide);
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}

function useFocusTrap(ref: React.RefObject<HTMLDivElement | null>, isActive: boolean) {
  React.useEffect(() => {
    if (!isActive || !ref.current) return;

    const container = ref.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isActive, ref]);
}

/**
 * Generic responsive bottom sheet with Material 3 design
 * Supports snap points: partial (50%) and full (90%) page
 * Keyboard-aware with proper insets and focus management
 */
export function ResponsiveDrawer({
  open,
  onOpenChange,
  title,
  children,
  className,
  headerRight,
}: ResponsiveDrawerProps) {
  const isNative = Capacitor.isNativePlatform();
  const cssKeyboardHeight = useKeyboardHeight();
  const { keyboardHeight: nativeKeyboardHeight, isKeyboardVisible } = useNativeKeyboardListener();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  const effectiveKeyboardHeight = isNative ? nativeKeyboardHeight : cssKeyboardHeight;
  
  const snapPoints = React.useMemo(
    () => isNative && !isKeyboardVisible ? calculateSnapPoints(effectiveKeyboardHeight) : undefined,
    [isNative, isKeyboardVisible, effectiveKeyboardHeight]
  );

  useFocusTrap(contentRef, open);

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
  }, [isNative, open]);

  const bottomPadding = isKeyboardVisible ? effectiveKeyboardHeight : 0;
  const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom') || '0');

  return (
    <Drawer open={open} onOpenChange={onOpenChange} snapPoints={snapPoints} dismissible={true}>
      <DrawerContent 
        ref={contentRef}
        className={cn("!rounded-b-none", className)}
        style={isNative ? {
          height: '100dvh',
          maxHeight: '100dvh',
        } : {
          maxHeight: '90vh',
        }}
      >
        {/* Strong backdrop overlay - blocks all background interaction */}
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onOpenChange(false);
            }
          }}
          style={{ zIndex: -1 }}
        />

        {/* Close Button - Safe area aware, 44px hitbox */}
        <DrawerClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute z-10 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive",
              "w-11 h-11 min-w-11 min-h-11", // 44px hitbox
              "top-4 right-4 sm:right-6", // Safe area aware
              "pl-2" // Extra padding from edge
            )}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </DrawerClose>

        {/* Header */}
        <DrawerHeader className="pt-2 pb-2 px-6 flex-shrink-0 pr-16">
          {headerRight ? (
            <div className="flex items-center justify-between w-full">
              <DrawerTitle className="font-bold text-lg">{title}</DrawerTitle>
              <div className="flex justify-end">{headerRight}</div>
            </div>
          ) : (
            <DrawerTitle className="text-center font-bold text-lg">
              {title}
            </DrawerTitle>
          )}
        </DrawerHeader>

        {/* Scrollable Content - Keyboard aware */}
        <div
          ref={scrollRef}
          className="px-4 flex-1"
          data-vaul-no-drag
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: `calc(${bottomPadding}px + max(var(--safe-area-inset-bottom, 0px), 8px) + 80px)`,
          }}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
