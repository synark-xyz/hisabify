import '@testing-library/jest-dom';

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
