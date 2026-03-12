import { useEffect } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Keyboard, type KeyboardInfo } from '@capacitor/keyboard';

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

    let keyboardShowListener: PluginListenerHandle | undefined;
    let keyboardHideListener: PluginListenerHandle | undefined;

    if (isOpen) {
      void Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
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
      }).then((listener) => {
        keyboardShowListener = listener;
      });

      void Keyboard.addListener('keyboardWillHide', () => {
        document.body.style.setProperty('--keyboard-height', '0px');
      }).then((listener) => {
        keyboardHideListener = listener;
      });
    }

    return () => {
      if (keyboardShowListener) {
        void keyboardShowListener.remove();
      }
      if (keyboardHideListener) {
        void keyboardHideListener.remove();
      }
      // Reset keyboard height
      document.body.style.setProperty('--keyboard-height', '0px');
    };
  }, [isOpen]);
}
