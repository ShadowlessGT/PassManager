import React from 'react';
import { createRoot } from 'react-dom/client';
import { preparePrivacyScreen } from './device';
import './styles.css';
import './ota.css';
import { loadPreferences } from './preferences';
import { applyLanguage } from './i18n';
import { resolveAppearance, applyResolvedAppearance } from './theme';
import OtaUpdateNotice from './OtaUpdateNotice';
import { notifyOtaAppReady } from './otaClient';

// Match the user's device before the first render to prevent a theme flash.
const startupPreferences = loadPreferences();
applyLanguage(startupPreferences.language);
const startAppearance = startupPreferences.appearance;
applyResolvedAppearance(resolveAppearance(startAppearance, window.matchMedia('(prefers-color-scheme: dark)').matches));

void preparePrivacyScreen().catch(() => {
  // Do not display potentially sensitive vault data if native screenshot protection fails.
  if (import.meta.env.PROD) document.documentElement.classList.add('privacy-guard-failed');
});

async function startApp() {
  try {
    // App Check must be initialized before Firebase calls. The native OTA
    // watchdog has a generous timeout so attestation does not cause a rollback.
    const { initializeNativeAppCheck } = await import('./appCheck');
    await initializeNativeAppCheck();
  } catch {
    document.documentElement.dataset.appCheckStatus = 'unavailable';
  }
  const { default: App } = await import('./App');
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
      <OtaUpdateNotice />
    </React.StrictMode>
  );

  // Only mark a just-switched web bundle healthy after React has had a chance
  // to render. Broken startup bundles automatically roll back natively.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    void notifyOtaAppReady().catch(() => {
      document.documentElement.dataset.otaReadyStatus = 'unavailable';
    });
  }));
}

void startApp();
