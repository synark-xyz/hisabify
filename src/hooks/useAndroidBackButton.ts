import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NavigateFunction } from 'react-router-dom';

// Routes that are considered "root" — back from here should exit the app.
const ROOT_PATHS = new Set(['/', '/auth', '/onboarding']);

/**
 * Handles the Android hardware/gesture back button.
 *
 * Behaviour:
 *  - If NOT on a root path → navigate(-1) (go to previous screen).
 *  - If ON a root path → first press shows "press again to exit" hint;
 *    second press within 2 s exits the app.
 *
 * Only active on Android.
 */
export function useAndroidBackButton(navigate: NavigateFunction) {
  const lastBackPress = useRef<number>(0);
  const hintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const handleBackButton = () => {
      const currentPath = window.location.pathname;
      const atRoot = ROOT_PATHS.has(currentPath);

      if (!atRoot) {
        // Navigate back within the app
        navigate(-1);
        return;
      }

      // At root — implement double-back-to-exit
      const now = Date.now();

      if (now - lastBackPress.current < 2000) {
        // Second press within window: exit
        if (hintTimeout.current) clearTimeout(hintTimeout.current);
        removeHint();
        App.exitApp();
        return;
      }

      // First press: record time and show hint
      lastBackPress.current = now;
      showExitHint();

      if (hintTimeout.current) clearTimeout(hintTimeout.current);
      hintTimeout.current = setTimeout(() => {
        lastBackPress.current = 0;
        removeHint();
      }, 2000);
    };

    // App.addListener returns a PluginListenerHandle (synchronous in Capacitor 8)
    let handle: { remove: () => void } | null = null;

    const setup = async () => {
      handle = await App.addListener('backButton', handleBackButton);
    };

    setup();

    return () => {
      handle?.remove();
      if (hintTimeout.current) clearTimeout(hintTimeout.current);
      removeHint();
    };
  }, [navigate]);
}

// ─── Exit hint ────────────────────────────────────────────────────────────────

const HINT_ID = 'android-exit-hint';

function showExitHint() {
  removeHint();

  // Inject keyframe once
  if (!document.getElementById('android-hint-style')) {
    const style = document.createElement('style');
    style.id = 'android-hint-style';
    style.textContent = `
      @keyframes android-hint-in {
        from { opacity: 0; transform: translateX(-50%) translateY(8px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  const el = document.createElement('div');
  el.id = HINT_ID;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '88px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(30,30,40,0.92)',
    color: '#fff',
    padding: '10px 22px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    zIndex: '999999',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(8px)',
    animation: 'android-hint-in 0.2s ease',
    pointerEvents: 'none',
  });
  el.textContent = 'Press back again to exit';
  document.body.appendChild(el);
}

function removeHint() {
  document.getElementById(HINT_ID)?.remove();
}
