import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Material 3 Filled Button (High emphasis)
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",

        // Material 3 Tonal Button (Medium emphasis)
        secondary: "bg-secondary/20 text-secondary-foreground hover:bg-secondary/30",

        // Material 3 Elevated Button (Medium emphasis with shadow)
        elevated: "bg-card text-card-foreground hover:bg-accent/10 shadow-md hover:shadow-lg",

        // Material 3 Outlined Button (Low emphasis)
        outline: "border-2 border-border bg-transparent hover:bg-accent/10 text-foreground",

        // Material 3 Text Button (Lowest emphasis)
        ghost: "hover:bg-accent/10 text-foreground",

        // Destructive variant (errors/delete actions)
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",

        // Link variant
        link: "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
