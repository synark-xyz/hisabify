import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { AddTransactionModal } from '@/components/AddTransactionModal';
import type { ScannedReceiptData } from '@/components/ReceiptScannerModal';

/**
 * The scan-receipt handoff: ReceiptScannerModal -> AddTransactionModal -> TransactionForm.
 *
 * The scanner extracts merchant/amount/date/receiptUrl and hands them to
 * AddTransactionModal.handleReceiptComplete, which stores them in `prefillData`
 * and bumps `prefillKey` to remount the form. These tests pin the contract that
 * every scanned field actually reaches the rendered form inputs.
 */

const scanned: ScannedReceiptData = {
  merchant: 'Lawson',
  amount: 1280,
  date: new Date('2026-03-04T00:00:00Z'),
  currency: 'JPY',
  receiptUrl: 'data:image/jpeg;base64,AAAA',
  provider: 'gemini-vision',
};

// Capture what TransactionForm is handed, and expose the scan trigger.
const seen = vi.hoisted(() => ({ initialData: null as Record<string, unknown> | null }));

vi.mock('@/components/TransactionForm', () => ({
  TransactionForm: (props: Record<string, unknown>) => {
    seen.initialData = props.initialData as Record<string, unknown>;
    return (
      <button type="button" onClick={props.onScanRequest as () => void}>
        scan
      </button>
    );
  },
}));

vi.mock('@/components/VoiceInputFlow', () => ({ VoiceInputFlow: () => null }));

// Stand in for the real scanner: fires onScanComplete with a finished scan.
vi.mock('@/components/ReceiptScannerModal', () => ({
  ReceiptScannerModal: ({
    open,
    onScanComplete,
  }: {
    open: boolean;
    onScanComplete: (d: ScannedReceiptData) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onScanComplete(scanned)}>
        finish-scan
      </button>
    ) : null,
}));

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ currency: 'USD', formatAmount: (n: number) => `$${n}` }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

async function runScan() {
  render(
    <AddTransactionModal open onOpenChange={vi.fn()} onSuccess={vi.fn()} />,
  );
  await act(async () => {
    fireEvent.click(screen.getByText('scan'));
  });
  // The scanner is lazy()-loaded, so it appears a tick after the click.
  const finish = await screen.findByText('finish-scan');
  await act(async () => {
    fireEvent.click(finish);
  });
  await waitFor(() => expect(seen.initialData?.merchant).toBeTruthy());
}

describe('scan receipt -> AddTransactionModal handoff', () => {
  beforeEach(() => {
    seen.initialData = null;
  });

  it('prefills merchant and amount from the scan', async () => {
    await runScan();
    expect(seen.initialData?.merchant).toBe('Lawson');
    expect(seen.initialData?.amount).toBe(1280);
  });

  it('prefills the detected currency', async () => {
    await runScan();
    expect(seen.initialData?.currency).toBe('JPY');
  });

  it('prefills the receipt date rather than defaulting to today', async () => {
    await runScan();
    expect(seen.initialData?.date).toEqual(scanned.date);
  });

  it('forwards the receipt image so it is saved on the transaction', async () => {
    await runScan();
    expect(seen.initialData?.receiptUrl).toBe(scanned.receiptUrl);
  });
});
