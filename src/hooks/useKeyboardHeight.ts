import { useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export function useKeyboardHeight() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const showListener = Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    });
    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    });

    return () => {
      showListener.then(l => l.remove());
      hideListener.then(l => l.remove());
    };
  }, []);
}
