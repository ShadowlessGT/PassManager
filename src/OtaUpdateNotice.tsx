import { useEffect, useRef, useState } from 'react';
import { DownloadCloud, RefreshCw, X } from 'lucide-react';
import { App as NativeApp } from '@capacitor/app';
import { currentLanguage } from './i18n';
import { findParolaWebUpdate, installParolaWebUpdate, otaSupported } from './otaClient';
import type { OtaRelease } from './otaManifest';

const FIRST_CHECK_DELAY_MS = 7000; // App is usable before the first network request.
const RESUME_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const DISMISSED_KEY = 'parola.ota.dismissed-version';

const strings = {
  de: {
    title: 'Parola-Update verfügbar',
    message: 'Die Web-Oberfläche kann aktualisiert werden, ohne die App neu zu installieren.',
    restart: 'Beim Aktualisieren wird Parola neu gestartet und der Tresor gesperrt.',
    size: 'Downloadgröße',
    install: 'Jetzt aktualisieren',
    later: 'Später',
    loading: 'Update wird geprüft und geladen …',
    error: 'Update fehlgeschlagen. Du kannst Parola weiterhin normal verwenden.',
  },
  en: {
    title: 'Parola update available',
    message: 'Update the app interface without reinstalling Parola.',
    restart: 'Updating restarts Parola and locks your vault.',
    size: 'Download size',
    install: 'Update now',
    later: 'Later',
    loading: 'Verifying and downloading update …',
    error: 'Update failed. You can continue using Parola normally.',
  },
  tr: {
    title: 'Parola güncellemesi hazır',
    message: 'Uygulamayı yeniden yüklemeden arayüzü güncelleyebilirsin.',
    restart: 'Güncelleme Parola\'yı yeniden başlatır ve kasanı kilitler.',
    size: 'Indirme boyutu',
    install: 'Şimdi güncelle',
    later: 'Daha sonra',
    loading: 'Güncelleme doğrulanıyor ve indiriliyor …',
    error: 'Güncelleme başarısız. Parola\'yı kullanmaya devam edebilirsin.',
  },
} as const;

function updateStrings() {
  const code = currentLanguage().toLowerCase().split('-')[0];
  if (code === 'de' || code === 'tr') return strings[code];
  return strings.en;
}

/**
 * Non-modal, fail-closed OTA notice. Web and old native binaries never run it.
 * The app stays fully offline-capable, and the user explicitly approves reloads.
 */
export default function OtaUpdateNotice() {
  const [release, setRelease] = useState<OtaRelease | null>(null);
  const [installing, setInstalling] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastCheck = useRef(0);
  const busyCheck = useRef(false);
  const t = updateStrings();

  useEffect(() => {
    if (!otaSupported()) return;
    let cancelled = false;

    async function check() {
      if (cancelled || busyCheck.current) return;
      busyCheck.current = true;
      lastCheck.current = Date.now();
      try {
        const next = await findParolaWebUpdate();
        if (!cancelled && next && localStorage.getItem(DISMISSED_KEY) !== next.version) {
          setRelease(next);
        }
      } catch {
        // Never block app start or display network errors as vault errors.
      } finally {
        busyCheck.current = false;
      }
    }

    const timer = window.setTimeout(() => { void check(); }, FIRST_CHECK_DELAY_MS);
    const listener = NativeApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive && Date.now() - lastCheck.current >= RESUME_CHECK_INTERVAL_MS) {
        void check();
      }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      void listener.then(handle => handle.remove()).catch(() => {});
    };
  }, []);

  function dismiss() {
    if (release) {
      try { localStorage.setItem(DISMISSED_KEY, release.version); } catch { /* optional */ }
    }
    setRelease(null);
    setFailed(false);
  }

  async function install() {
    if (!release || installing) return;
    setInstalling(true);
    setFailed(false);
    try {
      await installParolaWebUpdate(release);
      // Native WebView normally reloads inside set(). If it did not, do not
      // silently dismiss the update as installed.
    } catch {
      setFailed(true);
    } finally {
      setInstalling(false);
    }
  }

  if (!otaSupported() || !release) return null;
  return (
    <aside className="ota-update-notice" role="status" aria-live="polite">
      <div className="ota-update-heading">
        <DownloadCloud size={21} aria-hidden="true"/>
        <strong>{t.title} · {release.version}</strong>
        <button type="button" className="ota-update-dismiss" onClick={dismiss}
          disabled={installing} aria-label={t.later}><X size={18}/></button>
      </div>
      <p>{release.notes || t.message}</p>
      <small>{t.size}: {(release.sizeBytes / (1024 * 1024)).toFixed(1)} MB · {t.restart}</small>
      {failed && <p className="ota-update-error">{t.error}</p>}
      <div className="ota-update-actions">
        <button type="button" className="ota-update-primary" onClick={() => { void install(); }}
          disabled={installing}>
          {installing ? <RefreshCw size={16} aria-hidden="true"/> : <DownloadCloud size={16} aria-hidden="true"/>}
          {installing ? t.loading : t.install}
        </button>
        <button type="button" onClick={dismiss} disabled={installing}>{t.later}</button>
      </div>
    </aside>
  );
}
