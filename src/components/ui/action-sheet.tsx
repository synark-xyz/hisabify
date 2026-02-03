import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { cn } from "@/lib/utils";

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}

interface ActionSheetItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ActionSheet({ open, onOpenChange, title, children }: ActionSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[320px] p-0 gap-0 overflow-hidden">
        {title && (
          <DialogHeader className="px-4 py-3 border-b border-border/50">
            <DialogTitle className="text-center text-base font-bold">
              {title}
            </DialogTitle>
          </DialogHeader>
        )}
        <div className="py-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ActionSheetItem({
  children,
  destructive,
  icon: Icon,
  className,
  onClick,
  ...props
}: ActionSheetItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-accent/10 active:bg-accent/20",
        "text-[15px] font-medium",
        destructive && "text-destructive hover:bg-destructive/10 active:bg-destructive/20",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
      <span className="flex-1">{children}</span>
    </button>
  );
}
