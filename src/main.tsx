import React from 'react';
import { createRoot } from 'react-dom/client';
import { preparePrivacyScreen } from './device';
import './styles.css';
import { loadPreferences } from './preferences';
import { applyLanguage } from './i18n';
import { resolveAppearance, applyResolvedAppearance } from './theme';

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
    // Initialization is gated for Android and must run before components use
    // Firebase calls. Do not block offline vault use if Play Integrity fails.
    const { initializeNativeAppCheck } = await import('./appCheck');
    await initializeNativeAppCheck();
  } catch {
    // App Check failures are not proof that the user's local vault is unsafe.
    // Server enforcement stays disabled until a real Play-installed E2E test.
    document.documentElement.dataset.appCheckStatus = 'unavailable';
  }
  const { default: App } = await import('./App');
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>
  );
}

void startApp();
