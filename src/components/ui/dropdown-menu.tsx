import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { Capacitor } from "@capacitor/core";

import { cn } from "@/lib/utils";
import { getOverlayRoot } from "@/lib/overlay-portal";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      // Mobile-first: Larger touch target, better spacing
      "flex cursor-pointer select-none items-center gap-3 rounded-xl px-4 py-3 text-[15px] outline-none transition-all duration-200",
      "data-[state=open]:bg-accent/20 focus:bg-accent/10",
      // Cyberpunk: Bouncy scale + glow
      "[html[data-variant='cyberpunk']_&]:data-[state=open]:shadow-[0_0_15px_rgba(0,255,255,0.3)]",
      "[html[data-variant='cyberpunk']_&]:data-[state=open]:scale-105",
      "[html[data-variant='cyberpunk']_&]:transition-all",
      "[html[data-variant='cyberpunk']_&]:duration-300",
      inset && "pl-11",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-5 w-5 opacity-70" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      // Mobile-optimized styling with solid background
      "z-[99999] min-w-[240px] overflow-hidden rounded-2xl border-2 bg-popover backdrop-blur-xl p-2 text-popover-foreground",
      // Enhanced shadows for depth
      "shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
      // Dropdown animation: slide from direction
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2",
      "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
      "data-[state=open]:duration-200 data-[state=closed]:duration-150",
      // Cyberpunk: Gold border + neon glow + solid background
      "[html[data-variant='cyberpunk']_&]:bg-popover",
      "[html[data-variant='cyberpunk']_&]:border-accent/30",
      "[html[data-variant='cyberpunk']_&]:shadow-[0_0_30px_rgba(255,215,0,0.2),0_0_15px_rgba(0,255,255,0.15)]",
      "[html[data-variant='cyberpunk']_&]:data-[state=open]:zoom-in-90",
      "[html[data-variant='cyberpunk']_&]:data-[state=open]:duration-300",
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, collisionPadding = 12, avoidCollisions = true, sticky = "partial", ...props }, ref) => {
  // Get overlay root synchronously to avoid clipping issues
  const overlayRoot = React.useMemo(() => {
    if (typeof document === 'undefined') return null;

    // Prioritize page-specific overlay root (e.g., budget-overlay-root) over global
    const budgetRoot = document.getElementById('budget-overlay-root');
    const savingsRoot = document.getElementById('savings-overlay-root');
    const pageRoot = budgetRoot || savingsRoot;

    return pageRoot || getOverlayRoot();
  }, []);

  return (
    <DropdownMenuPrimitive.Portal container={overlayRoot}>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        avoidCollisions={avoidCollisions}
        sticky={sticky}
        className={cn(
          // Mobile-optimized: Larger minimum width, generous padding, SOLID background
          "z-[99999] min-w-[240px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border-2 bg-popover backdrop-blur-xl p-2 text-popover-foreground",
          // Enhanced shadows for better depth perception
          "shadow-[0_8px_30px_rgb(0,0,0,0.12)]",
          // Dropdown animation: slide from top + fade in
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=top]:slide-in-from-bottom-2 data-[side=bottom]:slide-in-from-top-2",
          "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
          "data-[state=open]:duration-200 data-[state=closed]:duration-150",
          // Cyberpunk: Gold border + neon glow + SOLID background
          "[html[data-variant='cyberpunk']_&]:bg-popover",
          "[html[data-variant='cyberpunk']_&]:border-accent/30",
          "[html[data-variant='cyberpunk']_&]:shadow-[0_0_30px_rgba(255,215,0,0.2),0_0_15px_rgba(0,255,255,0.15)]",
          "[html[data-variant='cyberpunk']_&]:data-[state=open]:zoom-in-90",
          "[html[data-variant='cyberpunk']_&]:data-[state=open]:duration-300",
          "[html[data-variant='cyberpunk']_&]:data-[state=closed]:duration-200",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      // Mobile-first: 44px minimum height (iOS guideline), larger text, generous padding
      "group relative flex cursor-pointer select-none items-center gap-3 rounded-xl px-4 py-3 min-h-[44px] text-[15px] font-medium outline-none",
      "transition-all duration-200 ease-out",
      // Default theme: Subtle hover with smooth transition
      "hover:bg-accent/10 focus:bg-accent/15 active:scale-[0.98]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      // Cyberpunk: Bouncy scale + glow on hover
      "[html[data-variant='cyberpunk']_&]:hover:bg-accent/5",
      "[html[data-variant='cyberpunk']_&]:hover:scale-[1.02]",
      "[html[data-variant='cyberpunk']_&]:hover:shadow-[0_0_10px_rgba(255,215,0,0.15)]",
      "[html[data-variant='cyberpunk']_&]:active:scale-[0.96]",
      "[html[data-variant='cyberpunk']_&]:transition-all",
      "[html[data-variant='cyberpunk']_&]:duration-300",
      // Focus ring for accessibility
      "focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
      inset && "pl-11",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      // Mobile-optimized with larger touch target
      "relative flex cursor-pointer select-none items-center gap-3 rounded-xl py-3 pl-11 pr-4 min-h-[44px] text-[15px] font-medium outline-none",
      "transition-all duration-200",
      "hover:bg-accent/10 focus:bg-accent/15 active:scale-[0.98]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      // Cyberpunk: Enhanced interaction
      "[html[data-variant='cyberpunk']_&]:hover:scale-[1.02]",
      "[html[data-variant='cyberpunk']_&]:hover:shadow-[0_0_10px_rgba(255,215,0,0.15)]",
      "[html[data-variant='cyberpunk']_&]:transition-all",
      "[html[data-variant='cyberpunk']_&]:duration-300",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-3 flex h-5 w-5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      // Mobile-optimized with larger touch target
      "relative flex cursor-pointer select-none items-center gap-3 rounded-xl py-3 pl-11 pr-4 min-h-[44px] text-[15px] font-medium outline-none",
      "transition-all duration-200",
      "hover:bg-accent/10 focus:bg-accent/15 active:scale-[0.98]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      // Cyberpunk: Enhanced interaction
      "[html[data-variant='cyberpunk']_&]:hover:scale-[1.02]",
      "[html[data-variant='cyberpunk']_&]:hover:shadow-[0_0_10px_rgba(255,215,0,0.15)]",
      "[html[data-variant='cyberpunk']_&]:transition-all",
      "[html[data-variant='cyberpunk']_&]:duration-300",
      className,
    )}
    {...props}
  >
    <span className="absolute left-3 flex h-5 w-5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-3 w-3 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      // Mobile-friendly label with better hierarchy
      "px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80",
      // Cyberpunk: Gold accent color
      "[html[data-variant='cyberpunk']_&]:text-accent/70",
      inset && "pl-11",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(
      // More prominent separator for better visual hierarchy
      "-mx-1 my-2 h-[2px] bg-gradient-to-r from-transparent via-muted to-transparent",
      // Cyberpunk: Gold gradient separator with glow
      "[html[data-variant='cyberpunk']_&]:via-accent/20",
      "[html[data-variant='cyberpunk']_&]:shadow-[0_0_8px_rgba(255,215,0,0.2)]",
      className
    )}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs font-semibold tracking-wider opacity-60",
        // Cyberpunk: Gold tint for shortcuts
        "[html[data-variant='cyberpunk']_&]:text-accent/70",
        className
      )}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
