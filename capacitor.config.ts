import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shadowlessstudios.passwordmanager',
  appName: 'Passwort Manager: Parola',
  webDir: 'dist',
  android: { allowMixedContent: false }
};

export default config;
