import { useSyncExternalStore } from 'react';

/**
 * Live connectivity flag, backed by the browser's `online`/`offline` events.
 *
 * Works inside the Capacitor WebView, so no `@capacitor/network` dependency is needed.
 * Note this reports *link* state, not reachability — a device on a captive-portal wifi
 * reports `true`. `toErrorVariant()` in `lib/errorState.ts` covers that gap by also
 * classifying failed requests, so never treat this as the only signal.
 */

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

// SSR/prerender has no navigator; assume online so nothing renders an offline screen.
function getServerSnapshot(): boolean {
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
