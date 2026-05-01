import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface FABContextValue {
  /** Hide the global FAB (e.g. when a page has its own FAB) */
  hideGlobalFAB: () => void;
  /** Show the global FAB again */
  showGlobalFAB: () => void;
  isGlobalFABHidden: boolean;
}

const FABContext = createContext<FABContextValue>({
  hideGlobalFAB: () => {},
  showGlobalFAB: () => {},
  isGlobalFABHidden: false,
});

export function FABProvider({ children }: { children: ReactNode }) {
  const [isHidden, setIsHidden] = useState(false);

  const hideGlobalFAB = useCallback(() => setIsHidden(true), []);
  const showGlobalFAB = useCallback(() => setIsHidden(false), []);

  return (
    <FABContext.Provider value={{ hideGlobalFAB, showGlobalFAB, isGlobalFABHidden: isHidden }}>
      {children}
    </FABContext.Provider>
  );
}

export function useFABContext() {
  return useContext(FABContext);
}
