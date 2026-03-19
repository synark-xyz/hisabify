import type { CapacitorConfig } from '@capacitor/cli';
import os from 'os';

// Get local IP automatically
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// APP_ENV controls where Capacitor loads the web app from:
// 'production' → no server config; uses bundled dist assets (for App Store/Play Store builds)
// 'staging'    → server.url points to Vercel deployment; accessible on any device without ngrok
// 'local'      → server.url points to local dev server (same network required)
const APP_ENV: 'production' | 'staging' | 'local' = 'production';

const STAGING_URL = 'https://hisabify-pi.vercel.app'; // update to preview URL when testing a branch

const DEVICE_TYPE: 'android-emulator' | 'android-physical' | 'ios-simulator' | 'ios-physical' = 'android-physical';

// Server URLs (used only when APP_ENV === 'local')
const LOCAL_IP = getLocalIP();
const PORT = 8080;

const DEVICE_URLS = {
  'android-emulator': `http://10.0.2.2:${PORT}`,
  'android-physical': `http://${LOCAL_IP}:${PORT}`,
  'ios-simulator': `http://localhost:${PORT}`,
  'ios-physical': `http://${LOCAL_IP}:${PORT}`,
};

const config: CapacitorConfig = {
  appId: 'io.synark.hisabify',
  appName: 'Hisabify',
  webDir: 'dist',
  ...(APP_ENV === 'staging' ? {
    server: { url: STAGING_URL },
  } : {}),
  ...(APP_ENV === 'local' ? {
    server: { url: DEVICE_URLS[DEVICE_TYPE], cleartext: true },
  } : {}),
  // APP_ENV === 'production': no server block — Capacitor loads from dist/
  android: {
    allowMixedContent: true,
    captureInput: true,
    // Only enable remote WebView debugging in non-production environments.
    webContentsDebuggingEnabled: APP_ENV !== 'production',
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      // Keep the native splash visible long enough for React to mount and resolve
      // the Capacitor Preferences check before we hand off to the web layer.
      // The React code calls CapacitorSplashScreen.hide() manually once ready,
      // so this duration is a safety ceiling, not a fixed delay.
      launchShowDuration: 2000,
      backgroundColor: '#080c14',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    Keyboard: {
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: false,
      accessoryBarVisible: true
    },
    PushNotifications: {
      presentationOptions: ["alert", "sound"],
    }
  }
};

// Log the active configuration
console.log(`\n🔧 Capacitor Config:`);
console.log(`   APP_ENV: ${APP_ENV}`);
console.log(`   Device: ${DEVICE_TYPE}\n`);

export default config;
