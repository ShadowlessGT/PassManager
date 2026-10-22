import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'eu.shadowlessstudios.passmanager',
  appName: 'PassManager',
  webDir: 'dist',
  android: { allowMixedContent: false }
};

export default config;
