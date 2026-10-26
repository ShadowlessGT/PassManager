import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eu.shadowlessstudios.passmanager',
  appName: 'Parola',
  webDir: 'dist',
  android: { allowMixedContent: false }
};

export default config;
