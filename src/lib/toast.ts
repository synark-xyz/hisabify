/**
 * Typed toast helpers.
 *
 * Usage:
 *   import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
 *
 *   toastSuccess('Saved!', 'Your changes have been saved.');
 *   toastError('Something went wrong', error.message);
 *   toastInfo('Did you know?', 'Cleared means confirmed against your bank.');
 *   toastWarning('Heads up', 'This budget is nearly exceeded.');
 */

import { toast } from "@/hooks/use-toast";

interface ToastOptions {
  /** Auto-dismiss duration in ms. Pass Infinity to keep open until manually closed. */
  duration?: number;
}

export function toastSuccess(title: string, description?: string, opts: ToastOptions = {}) {
  toast({ variant: "success", title, description, duration: opts.duration ?? 4000 });
}

export function toastError(title: string, description?: string, opts: ToastOptions = {}) {
  toast({ variant: "destructive", title, description, duration: opts.duration ?? 6000 });
}

export function toastInfo(title: string, description?: string, opts: ToastOptions = {}) {
  toast({ variant: "info", title, description, duration: opts.duration ?? Infinity });
}

export function toastWarning(title: string, description?: string, opts: ToastOptions = {}) {
  toast({ variant: "warning", title, description, duration: opts.duration ?? 5000 });
}
