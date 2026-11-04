import { Capacitor } from '@capacitor/core';

/** Bridge native Play Integrity App Check tokens to Firebase JS in the WebView.
 * Enable only in Play-installed internal builds after Firebase App Check setup.
 * Keep server-side enforcement off until a real Play-installed device is verified.
 */
export async function initializeNativeAppCheck(): Promise<void> {
  if (import.meta.env.VITE_APPCHECK_ENABLED !== 'true' || Capacitor.getPlatform() !== 'android') return;
  const { FirebaseAppCheck } = await import('@capacitor-firebase/app-check');
  const { CustomProvider, initializeAppCheck } = await import('firebase/app-check');
  const { getApp } = await import('firebase/app');
  await FirebaseAppCheck.initialize();
  await FirebaseAppCheck.setTokenAutoRefreshEnabled({ enabled: true });
  const { cloudConfigured } = await import('./cloud');
  if (!cloudConfigured) return;
  initializeAppCheck(getApp(), {
    provider: new CustomProvider({
      getToken: async () => {
        const result = await FirebaseAppCheck.getToken({ forceRefresh: false });
        if (!result.token || !result.expireTimeMillis) {
          throw new Error('Native App Check token or expiry missing');
        }
        return { token: result.token, expireTimeMillis: result.expireTimeMillis };
      },
    }),
    isTokenAutoRefreshEnabled: true,
  });
}
