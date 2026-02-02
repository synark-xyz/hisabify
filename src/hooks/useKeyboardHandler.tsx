import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Hook to handle Capacitor Keyboard events for mobile devices
 * Automatically adjusts viewport when keyboard shows/hides
 */
export function useKeyboardHandler(isOpen: boolean) {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let keyboardShowListener: any;
    let keyboardHideListener: any;

    if (isOpen) {
      keyboardShowListener = Keyboard.addListener('keyboardWillShow', (info) => {
        // Adjust the body to accommodate keyboard
        const keyboardHeight = info.keyboardHeight;
        document.body.style.setProperty('--keyboard-height', `${keyboardHeight}px`);

        // Scroll to focused input if needed
        setTimeout(() => {
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      });

      keyboardHideListener = Keyboard.addListener('keyboardWillHide', () => {
        document.body.style.setProperty('--keyboard-height', '0px');
      });
    }

    return () => {
      if (keyboardShowListener) {
        keyboardShowListener.remove();
      }
      if (keyboardHideListener) {
        keyboardHideListener.remove();
      }
      // Reset keyboard height
      document.body.style.setProperty('--keyboard-height', '0px');
    };
  }, [isOpen]);
}
