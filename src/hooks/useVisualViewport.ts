import { useEffect, useState } from 'react';

/**
 * Hook to track visual viewport changes (keyboard open/close)
 * Returns the bottom offset when keyboard is open
 */
export function useVisualViewport() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      // Calculate keyboard height
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const diff = windowHeight - viewportHeight;

      // Keyboard is open if viewport is significantly smaller than window
      const isOpen = diff > 150; // 150px threshold

      setIsKeyboardOpen(isOpen);
      setKeyboardHeight(isOpen ? diff : 0);
    };

    // Listen to viewport changes
    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    // Initial check
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
