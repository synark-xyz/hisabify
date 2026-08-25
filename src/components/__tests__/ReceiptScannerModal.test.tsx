import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ReceiptScannerModal } from '@/components/ReceiptScannerModal';

/**
 * ReceiptScannerModal behaviour that is not covered by the handoff test:
 *  - Privacy Mode must not ship the image to Gemini (the banner promises it won't).
 *  - A failed extraction must return to the capture screen rather than stranding the
 *    user on a preview whose only enabled button is "Retake".
 */

const state = vi.hoisted(() => ({ privacyMode: false }));
const toast = vi.hoisted(() => vi.fn());
const callGeminiVision = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ privacyMode: state.privacyMode }),
}));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ ensurePermission: vi.fn().mockResolvedValue(true) }),
}));
vi.mock('@/hooks/useCurrency', () => ({ useCurrency: () => ({ currency: 'USD' }) }));
vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/lib/geminiVision', () => ({
  callGeminiVision,
  GEMINI_KEY_MISSING: 'GEMINI_KEY_MISSING',
}));
vi.mock('@/lib/imageProcessor', () => ({
  compressForGemini: vi.fn().mockResolvedValue({ base64: 'AAAA', mimeType: 'image/jpeg' }),
}));

function renderScanner() {
  return render(
    <ReceiptScannerModal open onOpenChange={vi.fn()} onScanComplete={vi.fn()} />,
  );
}

/** Drive the hidden camera file input, which is what both capture buttons end up using. */
async function pickFile(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

describe('ReceiptScannerModal', () => {
  beforeEach(() => {
    state.privacyMode = false;
    toast.mockClear();
    callGeminiVision.mockReset();
  });

  it('does not send the image to Gemini when Privacy Mode is on', async () => {
    state.privacyMode = true;
    const { container } = renderScanner();

    await pickFile(container);

    expect(callGeminiVision).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Privacy Mode is On' }),
    );
  });

  it('disables the capture buttons when Privacy Mode is on', () => {
    state.privacyMode = true;
    renderScanner();

    expect(screen.getByText('Camera').closest('button')).toBeDisabled();
    expect(screen.getByText('Gallery').closest('button')).toBeDisabled();
  });

  it('scans normally when Privacy Mode is off', async () => {
    callGeminiVision.mockResolvedValue({ merchant: 'Lawson', amount: 1280, confidence: 'high' });
    const { container } = renderScanner();

    await pickFile(container);

    await waitFor(() => expect(callGeminiVision).toHaveBeenCalled());
    expect(await screen.findByText('Lawson')).toBeInTheDocument();
  });

  it('returns to the capture screen when extraction fails', async () => {
    callGeminiVision.mockRejectedValue(new Error('boom'));
    const { container } = renderScanner();

    await pickFile(container);

    // Back on the capture screen, so the user can retry or pick another image.
    await waitFor(() => expect(screen.getByText('Camera')).toBeInTheDocument());
    expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Scan Failed' }),
    );
  });
});
