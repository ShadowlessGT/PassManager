import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  canonicalOtaRelease, compareOtaVersions, verifyOtaManifest, OTA_MANIFEST_URL,
} from './otaManifest';
import type { OtaRelease } from './otaManifest';

const release: OtaRelease = {
  version: '0.7.3',
  minNativeCode: 19,
  maxNativeCode: 19,
  publishedAt: '2026-11-09T08:00:00.000Z',
  zipUrl: 'https://parola.shadowless-studios.eu/ota/android/bundles/parola-web-0.7.3-abc123.zip',
  sha256: 'a'.repeat(64),
  sizeBytes: 125000,
  notes: 'UI improvements',
};
const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const verificationKey = keys.publicKey.export({ format: 'jwk' });
function signed(item = release) {
  return {
    schema: 1,
    release: item,
    signature: sign('sha256', Buffer.from(canonicalOtaRelease(item)),
      { key: keys.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url'),
  };
}

describe('Parola OTA signed release gate', () => {
  it('only checks the existing Hostinger Parola site', () => {
    expect(OTA_MANIFEST_URL).toBe('https://parola.shadowless-studios.eu/ota/android/stable.json');
  });
  it('accepts a properly signed, native-compatible release', async () => {
    expect(await verifyOtaManifest(signed(), verificationKey)).toEqual(release);
  });
  it('rejects a changed download URL even when the old signature is intact', async () => {
    const manifest = signed();
    manifest.release = { ...release, zipUrl: 'https://evil.example/asset.zip' };
    expect(await verifyOtaManifest(manifest, verificationKey)).toBeNull();
  });
  it('rejects modified checksum and version', async () => {
    const manifest = signed();
    manifest.release = { ...release, sha256: 'b'.repeat(64), version: '0.7.4' };
    expect(await verifyOtaManifest(manifest, verificationKey)).toBeNull();
  });
  it('rejects a release outside the pinned domain even if signed', async () => {
    const external = { ...release, zipUrl: 'https://some-other-domain.example/zip.zip' };
    expect(await verifyOtaManifest(signed(external), verificationKey)).toBeNull();
  });
  it('rejects invalid native compatibility ranges even if signed', async () => {
    const invalid = { ...release, minNativeCode: 20, maxNativeCode: 19 };
    expect(await verifyOtaManifest(signed(invalid), verificationKey)).toBeNull();
  });
  it('rejects invalid ECDSA signatures', async () => {
    const manifest = signed();
    manifest.signature = 'a'.repeat(86);
    expect(await verifyOtaManifest(manifest, verificationKey)).toBeNull();
  });
  it('sorts numeric release versions instead of lexical strings', () => {
    expect(compareOtaVersions('0.7.10', '0.7.9')).toBe(1);
    expect(compareOtaVersions('0.7.3', '0.7.3')).toBe(0);
    expect(compareOtaVersions('0.7.2', '0.7.3')).toBe(-1);
    expect(() => compareOtaVersions('0.7.2-rc1', '0.7.2')).toThrow();
  });
});
