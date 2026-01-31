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

// Configuration switches
const USE_LOCALHOST = false; // Toggle between localhost and ngrok - SET TO FALSE FOR PRODUCTION BUILD
const DEVICE_TYPE: 'android-emulator' | 'android-physical' | 'ios-simulator' | 'ios-physical' = 'android-physical';

// Server URLs
const LOCAL_IP = getLocalIP();
const PORT = 8080;

const DEVICE_URLS = {
  'android-emulator': `http://10.0.2.2:${PORT}`,
  'android-physical': `http://${LOCAL_IP}:${PORT}`,
  'ios-simulator': `http://localhost:${PORT}`,
  'ios-physical': `http://${LOCAL_IP}:${PORT}`,
};

const NGROK_URL = 'https://leticia-flavorsome-hooly.ngrok-free.dev';

const config: CapacitorConfig = {
  appId: 'io.synark.hisabify',
  appName: 'Hisabify',
  webDir: 'dist',
  // No server config - will use built assets from dist folder
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

// Log the active configuration
console.log(`\n🔧 Capacitor Config:`);
console.log(`   Mode: Production Build (using bundled assets)`);
console.log(`   Device: ${DEVICE_TYPE}\n`);

export default config;
