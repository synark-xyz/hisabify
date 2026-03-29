import { toast } from 'sonner';

export const APP_BASE_URL = 'https://hisabify.app';

interface SharePayload {
  title: string;
  text: string;
  url: string;
}

/**
 * Try native share, fall back to clipboard copy.
 * Returns 'shared' | 'copied' | null (if user cancelled or error).
 */
export async function shareOrCopy(
  payload: SharePayload,
  copiedToast = 'Copied to clipboard!',
): Promise<'shared' | 'copied' | null> {
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return null;
    }
  }

  try {
    await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
    toast.success(copiedToast);
    return 'copied';
  } catch {
    toast.error('Could not copy to clipboard');
    return null;
  }
}
