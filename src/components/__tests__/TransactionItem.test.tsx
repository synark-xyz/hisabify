import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TransactionItem } from '@/components/TransactionItem';
import type { Transaction } from '@/types';

// Swipe-to-reveal was replaced by press-and-hold. The failure mode that matters is a
// long press firing while the user is scrolling the list, so the move-cancel is the
// case worth guarding.

vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ currency: 'USD', formatAmount: (n: number) => `$${n}` }),
  currencyData: { USD: { symbol: '$' } },
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ variant: 'default' }),
}));

const transaction = {
  id: 'tx-1',
  merchant: 'Coffee',
  amount: 5,
  type: 'expense',
  date: '2026-01-04T10:00:00Z',
  currency_base: 'USD',
} as unknown as Transaction;

const press = (el: HTMLElement, x = 0, y = 0) => fireEvent.pointerDown(el, { button: 0, clientX: x, clientY: y });
const row = () => screen.getByText('Coffee').closest('.card-3d') as HTMLElement;

describe('TransactionItem long press', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('reveals the edit and delete actions after a held press', () => {
    render(<TransactionItem transaction={transaction} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByLabelText('Edit transaction')).toBeNull();

    press(row());
    act(() => { vi.advanceTimersByTime(500); });

    expect(screen.getByLabelText('Edit transaction')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete transaction')).toBeInTheDocument();
  });

  it('cancels the press once the finger moves past the tolerance (a scroll)', () => {
    render(<TransactionItem transaction={transaction} onEdit={vi.fn()} onDelete={vi.fn()} />);

    press(row());
    fireEvent.pointerMove(row(), { clientX: 0, clientY: 40 });
    act(() => { vi.advanceTimersByTime(500); });

    expect(screen.queryByLabelText('Edit transaction')).toBeNull();
  });

  it('keeps a small jitter within tolerance from cancelling the press', () => {
    render(<TransactionItem transaction={transaction} onEdit={vi.fn()} onDelete={vi.fn()} />);

    press(row());
    fireEvent.pointerMove(row(), { clientX: 3, clientY: 4 });
    act(() => { vi.advanceTimersByTime(500); });

    expect(screen.getByLabelText('Edit transaction')).toBeInTheDocument();
  });

  it('opens the details page on a tap but not after a long press', () => {
    const onViewDetails = vi.fn();
    render(<TransactionItem transaction={transaction} onEdit={vi.fn()} onDelete={vi.fn()} onViewDetails={onViewDetails} />);

    press(row());
    fireEvent.pointerUp(row());
    fireEvent.click(row());
    expect(onViewDetails).toHaveBeenCalledTimes(1);

    press(row());
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.pointerUp(row());
    fireEvent.click(row());
    expect(onViewDetails).toHaveBeenCalledTimes(1);
  });

  it('does not arm the long press on rows with no actions', () => {
    render(<TransactionItem transaction={transaction} />);

    press(row());
    act(() => { vi.advanceTimersByTime(500); });

    expect(screen.queryByLabelText('Edit transaction')).toBeNull();
  });
});
