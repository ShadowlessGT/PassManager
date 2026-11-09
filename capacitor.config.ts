import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shadowlessstudios.passwordmanager',
  appName: 'Passwort Manager: Parola',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    CapacitorUpdater: {
      // No vendor network calls or silent code replacement.
      // Parola verifies its own signed Firebase-hosted manifest.
      autoUpdate: 'off',
      appReadyTimeout: 60000,
      statsUrl: '',
      updateUrl: '',
      channelUrl: '',
      resetWhenUpdate: true
    }
  }
};

export default config;
