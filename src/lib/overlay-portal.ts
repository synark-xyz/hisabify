/**
 * Get the global overlay root element for portals (dropdowns, popovers, dialogs)
 * This ensures overlays never go off-screen and are properly positioned
 * @returns HTMLElement or null if not in browser environment
 */
export function getOverlayRoot(): HTMLElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null; // SSR-safe
  }

  return document.getElementById('overlay-root');
}

/**
 * Hook to get overlay root (safe for React components)
 */
export function useOverlayRoot(): HTMLElement | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const [root, setRoot] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setRoot(getOverlayRoot());
  }, []);

  return root;
}

// For non-React contexts, export a getter that returns the element or creates a fallback
export function getOrCreateOverlayRoot(): HTMLElement {
  let root = getOverlayRoot();

  if (!root && typeof document !== 'undefined') {
    // Fallback: create overlay root if it doesn't exist
    root = document.createElement('div');
    root.id = 'overlay-root';
    document.body.appendChild(root);
  }

  return root!;
}

// Import React for the hook
import * as React from 'react';
