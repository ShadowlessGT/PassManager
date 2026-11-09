import { PAROLA_OTA_PUBLIC_KEY } from './otaPublicKey';

/**
 * A signed manifest is the only authority for remotely executable web assets.
 * Pinned HTTPS origin + P-256 signature + SHA-256 zip checksum are mandatory.
 */
export const OTA_ORIGIN = 'https://parola.shadowless-studios.eu';
export const OTA_MANIFEST_URL = OTA_ORIGIN + '/ota/android/stable.json';
export const OTA_MAX_MANIFEST_BYTES = 8192;
export const OTA_MAX_BUNDLE_BYTES = 80 * 1024 * 1024;

export type OtaRelease = {
  version: string;
  minNativeCode: number;
  maxNativeCode: number;
  publishedAt: string;
  zipUrl: string;
  sha256: string;
  sizeBytes: number;
  notes: string;
};

export type SignedOtaManifest = {
  schema: 1;
  release: OtaRelease;
  signature: string; // Base64url of 64-byte IEEE-P1363 ECDSA signature
};

// The exact same domain-separated array is signed by scripts/ota-release.mjs.
// Independent of JSON key order, locales, or whitespace.
export function canonicalOtaRelease(release: OtaRelease): string {
  return JSON.stringify([
    'parola-ota-manifest-v1',
    release.version,
    release.minNativeCode,
    release.maxNativeCode,
    release.publishedAt,
    release.zipUrl,
    release.sha256,
    release.sizeBytes,
    release.notes,
  ]);
}

export function compareOtaVersions(a: string, b: string): number {
  const pattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  const aa = a.match(pattern);
  const bb = b.match(pattern);
  if (!aa || !bb) throw new Error('Ungültige Parola-Webversionsnummer');
  for (let i = 1; i <= 3; i++) {
    const difference = Number(aa[i]) - Number(bb[i]);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function isOtaRelease(value: unknown): value is OtaRelease {
  if (!value || typeof value !== 'object') return false;
  const p = value as Partial<OtaRelease>;
  if (typeof p.version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(p.version)) return false;
  if (!Number.isSafeInteger(p.minNativeCode) || !Number.isSafeInteger(p.maxNativeCode)
    || p.minNativeCode! < 1 || p.maxNativeCode! < p.minNativeCode! || p.maxNativeCode! > 999999999) return false;
  if (typeof p.publishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(p.publishedAt)
    || !Number.isFinite(Date.parse(p.publishedAt))) return false;
  if (typeof p.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(p.sha256)) return false;
  if (!Number.isSafeInteger(p.sizeBytes) || p.sizeBytes! < 100 || p.sizeBytes! > OTA_MAX_BUNDLE_BYTES) return false;
  if (typeof p.notes !== 'string' || p.notes.length > 240) return false;
  if (typeof p.zipUrl !== 'string' || p.zipUrl.length > 300) return false;
  try {
    const url = new URL(p.zipUrl);
    if (url.origin !== OTA_ORIGIN || url.href !== p.zipUrl || url.search || url.hash
      || !/^\/ota\/android\/bundles\/[a-zA-Z0-9._-]+\.zip$/.test(url.pathname)) return false;
  } catch {
    return false;
  }
  return true;
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Ungültige OTA-Signatur');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

/**
 * Fails closed: never trust a version, URL, checksum, or compatibility range
 * from the network unless the signature verifies against the key in the AAB.
 */
export async function verifyOtaManifest(
  data: unknown,
  trustedKey: JsonWebKey = PAROLA_OTA_PUBLIC_KEY,
): Promise<OtaRelease | null> {
  if (!data || typeof data !== 'object') return null;
  const manifest = data as Partial<SignedOtaManifest>;
  if (manifest.schema !== 1 || !isOtaRelease(manifest.release)
    || typeof manifest.signature !== 'string') return null;
  try {
    const signature = fromBase64Url(manifest.signature);
    if (signature.byteLength !== 64) return null;
    const key = await crypto.subtle.importKey('jwk', trustedKey,
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const message = new TextEncoder().encode(canonicalOtaRelease(manifest.release));
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, key, signature as BufferSource, message,
    );
    return valid ? manifest.release : null;
  } catch {
    return null;
  }
}
