import * as React from "react";
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

/**
 * Generic responsive bottom sheet with Material 3 design
 * Height: min=wrap_content, max=66vh (2/3 screen)
 */
export function ResponsiveDrawer({
  open,
  onOpenChange,
  title,
  children,
  className,
  headerRight,
}: ResponsiveDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn("max-h-[66vh]", className)}>
        {/* Close Button - Top Right */}
        <DrawerClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerClose>

        {/* Header */}
        <DrawerHeader className="pt-2 pb-2 px-6 flex-shrink-0">
          {headerRight ? (
            <div className="flex items-center justify-between">
              <div className="w-16" />
              <DrawerTitle className="font-bold text-lg">{title}</DrawerTitle>
              <div className="flex justify-end w-16 pr-8">{headerRight}</div>
            </div>
          ) : (
            <DrawerTitle className="text-center font-bold text-lg">
              {title}
            </DrawerTitle>
          )}
        </DrawerHeader>

        {/* Scrollable Content */}
        <div
          className="px-4 pb-6 flex-1"
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
