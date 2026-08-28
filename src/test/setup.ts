import '@testing-library/jest-dom';

// jsdom ships neither of these, and both are reached during an ordinary render:
// react-modal-sheet (every BaseModalSheet) constructs a ResizeObserver, and
// useTheme resolves `system` through matchMedia. Without them a component that
// merely *contains* a sheet throws before any assertion runs.
if (typeof window !== 'undefined') {
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', {
      value: ResizeObserverStub,
      writable: true,
      configurable: true,
    });
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  }

  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
      writable: true,
      configurable: true,
    });
  }
}

// Ensure localStorage and sessionStorage are properly initialized in jsdom
if (typeof window !== 'undefined') {
  if (!window.localStorage) {
    const createStorage = () => {
      const store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
        get length() { return Object.keys(store).length; },
        key: (index: number) => Object.keys(store)[index] ?? null,
      };
    };

    Object.defineProperty(window, 'localStorage', {
      value: createStorage(),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: createStorage(),
      writable: true,
      configurable: true,
    });
  }
}
