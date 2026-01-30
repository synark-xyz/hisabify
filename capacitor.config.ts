import type { CapacitorConfig } from '@capacitor/cli';

// Set to true to use localhost, false to use ngrok
const USE_LOCALHOST = true;

// Localhost configuration (change IP to your machine's local IP)
// For Android Emulator: use 10.0.2.2
// For Android Physical Device: use your computer's IP (e.g., 192.168.1.x)
// For iOS Simulator: use localhost
const LOCALHOST_URL = 'http://10.0.2.2:8080'; // Android Emulator
// const LOCALHOST_URL = 'http://192.168.1.100:8080'; // Physical Device - Update with your IP
// const LOCALHOST_URL = 'http://localhost:8080'; // iOS Simulator

const NGROK_URL = 'https://leticia-flavorsome-hooly.ngrok-free.dev';

const config: CapacitorConfig = {
  appId: 'io.synark.hisabify',
  appName: 'Hisabify',
  webDir: 'dist',
  server: USE_LOCALHOST ? {
    url: LOCALHOST_URL,
    cleartext: true,
    androidScheme: 'http',
    iosScheme: 'http',
    allowNavigation: [
      'localhost:*',
      '10.0.2.2:*',
      '192.168.*.*:*',
      '*.ngrok-free.dev'
    ]
  } : {
    url: NGROK_URL,
    cleartext: true,
    allowNavigation: ['*.ngrok-free.dev']
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false
  }
};

export default config;
