import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.synark.hisabify',
  appName: 'Hisabify',
  webDir: 'dist',
  server: {
    url: 'https://leticia-flavorsome-hooly.ngrok-free.dev',
    cleartext: true
  }
};

export default config;
