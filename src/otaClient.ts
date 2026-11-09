import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import {
  OTA_MANIFEST_URL, OTA_MAX_MANIFEST_BYTES, compareOtaVersions,
  verifyOtaManifest,
} from './otaManifest';
import type { OtaRelease } from './otaManifest';

export function otaSupported(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
}

// Native updater's app-ready watchdog rolls back an OTA bundle that cannot boot.
// This must be called ONLY after React has mounted, on every launch.
export async function notifyOtaAppReady(): Promise<void> {
  if (!otaSupported()) return;
  await CapacitorUpdater.notifyAppReady();
}

async function fetchLimitedJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null; // No OTA has been published yet (404).
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > OTA_MAX_MANIFEST_BYTES) return null;

    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > OTA_MAX_MANIFEST_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let pos = 0;
    for (const part of chunks) {
      bytes.set(part, pos);
      pos += part.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } finally {
    window.clearTimeout(timer);
  }
}

export async function findParolaWebUpdate(): Promise<OtaRelease | null> {
  if (!otaSupported() || !navigator.onLine) return null;
  try {
    const info = await NativeApp.getInfo();
    const nativeCode = Number(info.build);
    if (!Number.isSafeInteger(nativeCode) || nativeCode < 1) return null;
    const current = await CapacitorUpdater.current();
    const installedVersion = current.bundle.version && current.bundle.version !== 'builtin'
      ? current.bundle.version : info.version;
    const manifest = await fetchLimitedJson(OTA_MANIFEST_URL);
    const release = await verifyOtaManifest(manifest);
    if (!release) return null;
    if (nativeCode < release.minNativeCode || nativeCode > release.maxNativeCode) return null;
    if (compareOtaVersions(release.version, installedVersion) <= 0) return null;
    return release;
  } catch {
    // Being offline or having a temporarily unavailable update server never
    // blocks access to encrypted local credentials.
    return null;
  }
}

export async function installParolaWebUpdate(release: OtaRelease): Promise<void> {
  if (!otaSupported()) throw new Error('Live-Updates sind nur in der Android-App verfügbar.');
  // Re-check authenticity and native compatibility before invoking native code;
  // all callers should obtain releases exclusively through findParolaWebUpdate.
  const latest = await findParolaWebUpdate();
  if (!latest || latest.version !== release.version || latest.sha256 !== release.sha256) {
    throw new Error('Die Update-Freigabe konnte nicht bestätigt werden. Bitte erneut versuchen.');
  }
  const bundle = await CapacitorUpdater.download({
    version: latest.version,
    url: latest.zipUrl,
    checksum: latest.sha256,
  });
  if (bundle.version !== latest.version || !bundle.id) {
    throw new Error('Das heruntergeladene Update ist ungültig.');
  }
  // Explicit user approval is required; no automatic restart or code swap.
  // A cold WebView restart clears the in-memory vault key and locks the vault.
  await CapacitorUpdater.set({ id: bundle.id });
}
