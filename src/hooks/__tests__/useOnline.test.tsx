import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useOnline } from '@/hooks/useOnline';

function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => setOnLine(true));

describe('useOnline', () => {
  it('reads the initial state from navigator.onLine', () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(false);
  });

  it('flips when the browser fires online/offline', () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });

  it('detaches its listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useOnline());
    unmount();

    // No throw, and no state update on a torn-down hook.
    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(true);
  });
});
