import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ErrorState } from '@/components/ErrorState';

describe('ErrorState', () => {
  it('announces itself to assistive tech', () => {
    render(<ErrorState variant="server" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('hides retry for notFound, which is not retryable', () => {
    render(<ErrorState variant="notFound" onRetry={vi.fn()} onGoHome={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('renders no action buttons when no handlers are supplied', () => {
    render(<ErrorState variant="offline" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('disables retry while a retry is in flight so it cannot be double-fired', async () => {
    let release: () => void = () => {};
    const onRetry = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));

    render(<ErrorState variant="offline" onRetry={onRetry} />);
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button).toBeDisabled());

    release();
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
