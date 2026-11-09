/**
 * One-time signing key setup. NEVER commit or upload the private key.
 * Run from the project root: node scripts/ota-init-key.mjs
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const privateKeyPath = resolve(process.env.PAROLA_OTA_PRIVATE_KEY
  || join(homedir(), 'Documents', 'Parola-OTA-Signing', 'parola-ota-ecdsa-p256-private.pem'));
const publicKeyPath = resolve('src', 'otaPublicKey.ts');
if (existsSync(privateKeyPath) || existsSync(publicKeyPath)) {
  throw new Error('Existing signing material found. Refusing key rotation/overwrite.');
}
mkdirSync(dirname(privateKeyPath), { recursive: true, mode: 0o700 });
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { flag: 'wx', mode: 0o600 });
writeFileSync(publicKeyPath,
  '// Public Parola OTA signature verification key; private material must never be in the app.\n'
  + 'export const PAROLA_OTA_PUBLIC_KEY: JsonWebKey = '
  + JSON.stringify(publicKey.export({ format: 'jwk' }), null, 2) + ';\n',
  { flag: 'wx' });
console.log('OTA signing key initialized. Keep this private key secure: ' + privateKeyPath);
console.log('Public verification key created at ' + publicKeyPath);
