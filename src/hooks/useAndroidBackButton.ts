import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle Android back button with exit confirmation.
 * Shows a confirmation dialog before exiting the app.
 * Only active on Android platform.
 */
export function useAndroidBackButton() {
  const lastBackPress = useRef<number>(0);
  const exitToastTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only handle back button on Android
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    console.log('[useAndroidBackButton] Registering Android back button handler');

    const handleBackButton = () => {
      const currentTime = Date.now();
      const timeSinceLastPress = currentTime - lastBackPress.current;

      // If back was pressed within 2 seconds, exit the app
      if (timeSinceLastPress < 2000) {
        console.log('[useAndroidBackButton] Double back press detected - exiting app');
        if (exitToastTimeout.current) {
          clearTimeout(exitToastTimeout.current);
        }
        App.exitApp();
        return;
      }

      // First back press - show toast notification
      console.log('[useAndroidBackButton] First back press - showing exit prompt');
      lastBackPress.current = currentTime;

      // Show toast message (we'll use a visual indicator in the UI)
      showExitPrompt();

      // Clear the exit prompt after 2 seconds
      if (exitToastTimeout.current) {
        clearTimeout(exitToastTimeout.current);
      }
      exitToastTimeout.current = setTimeout(() => {
        lastBackPress.current = 0;
      }, 2000);
    };

    // Register back button listener
    const listener = App.addListener('backButton', handleBackButton);

    // Cleanup
    return () => {
      console.log('[useAndroidBackButton] Removing Android back button handler');
      listener.remove();
      if (exitToastTimeout.current) {
        clearTimeout(exitToastTimeout.current);
      }
    };
  }, []);
}

/**
 * Show exit prompt at the bottom of the screen.
 * Uses a temporary toast-like message.
 */
function showExitPrompt() {
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'android-exit-toast';
  toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-lg z-[100000] animate-in fade-in slide-in-from-bottom-2 duration-200';
  toast.textContent = 'Press back again to exit';
  toast.style.fontWeight = '600';
  toast.style.fontSize = '14px';
  toast.style.whiteSpace = 'nowrap';

  // Remove existing toast if present
  const existing = document.getElementById('android-exit-toast');
  if (existing) {
    existing.remove();
  }

  // Add to body
  document.body.appendChild(toast);

  // Auto-remove after 2 seconds with fade out animation
  setTimeout(() => {
    toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-2');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 200);
  }, 2000);
}
