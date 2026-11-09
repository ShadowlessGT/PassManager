import { createHash, createPublicKey, verify } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

/**
 * Independent offline verification for an OTA release candidate.
 * Usage: node scripts/ota-verify.mjs
 * Prints checks, but never reads or needs the private signing key.
 */
const dir = process.argv.includes('--public')
  ? resolve('ota-public', 'ota', 'android')
  : resolve('ota-staging', 'ota', 'android');
const file = join(dir, 'stable.json');
if (!existsSync(file)) throw Error('Signed stable.json missing');
const m = JSON.parse(readFileSync(file, 'utf8'));
if (m.schema !== 1 || typeof m.signature !== 'string' || !m.release) {
  throw Error('Invalid OTA manifest schema');
}
const r = m.release;
const src = readFileSync(resolve('src', 'otaPublicKey.ts'), 'utf8');
const match = src.match(/PAROLA_OTA_PUBLIC_KEY: JsonWebKey = (\{[\s\S]*?\});/);
if (!match) throw Error('Pinned public key missing');
const publicKey = createPublicKey({ key: JSON.parse(match[1]), format: 'jwk' });
const canonical = JSON.stringify([
  'parola-ota-manifest-v1', r.version, r.minNativeCode, r.maxNativeCode,
  r.publishedAt, r.zipUrl, r.sha256, r.sizeBytes, r.notes,
]);
const valid = verify('sha256', Buffer.from(canonical),
  { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(m.signature, 'base64url'));
if (!valid) throw Error('OTA manifest signature invalid');
if (typeof r.zipUrl !== 'string' || !r.zipUrl.startsWith('https://parola.shadowless-studios.eu/ota/android/bundles/')) {
  throw Error('Untrusted bundle URL');
}
const path = join(dir, 'bundles', basename(new URL(r.zipUrl).pathname));
if (!existsSync(path)) throw Error('Signed bundle ZIP missing: ' + path);
const zip = readFileSync(path);
const actual = createHash('sha256').update(zip).digest('hex');
if (actual !== r.sha256 || statSync(path).size !== r.sizeBytes) throw Error('Bundle bytes do not match signed release');
if (zip.subarray(0, 4).toString('hex') !== '504b0304') throw Error('Bundle is not a ZIP file');
console.log('OTA release verified: signature=P-256/SHA-256, ZIP hash=SHA-256, version=' + r.version);
console.log('Native codes: ' + r.minNativeCode + '..' + r.maxNativeCode);
console.log('Bundle size: ' + r.sizeBytes + ' bytes');
console.log('Local verification only. No internet deployment.');
