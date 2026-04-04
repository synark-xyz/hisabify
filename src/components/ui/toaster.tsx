import { CheckCircle2, XCircle, Info, AlertTriangle, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import type { ToastProps } from "@/components/ui/toast";

type ToastVariant = ToastProps["variant"];

function ToastIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
    case "destructive":
      return <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />;
    case "info":
      return <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
    default:
      return <Bell className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />;
  }
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <ToastIcon variant={props.variant} />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
