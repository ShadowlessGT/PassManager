import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { preparePrivacyScreen } from './device';
import './styles.css';
import { loadPreferences } from './preferences';
import { resolveAppearance, applyResolvedAppearance } from './theme';

// Match the user's device before the first render to prevent a theme flash.
const startAppearance = loadPreferences().appearance;
applyResolvedAppearance(resolveAppearance(startAppearance, window.matchMedia('(prefers-color-scheme: dark)').matches));

void preparePrivacyScreen().catch(() => {
  // Do not display potentially sensitive vault data if native screenshot protection fails.
  if (import.meta.env.PROD) document.documentElement.classList.add('privacy-guard-failed');
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
