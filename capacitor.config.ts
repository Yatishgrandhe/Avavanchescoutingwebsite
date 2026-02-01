import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.avalanche.scouting',
  appName: 'Avalanche Scouting',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
