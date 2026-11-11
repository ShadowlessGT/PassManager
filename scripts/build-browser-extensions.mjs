/**
 * Build two local, unpacked MV3 packages with identical audited JS logic.
 * No remote JavaScript, no signing key, no service-account credential.
 * Firebase Web API key is client-public; it is not a Google Admin API key.
 *
 * node scripts/build-browser-extensions.mjs
 */
import { existsSync, readFileSync, rmSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve('.');
const source = join(root, 'extensions', 'browser');
const shared = join(root, 'extensions', 'shared');
const output = join(root, 'browser-build');

function envValues() {
  const env = {};
  const local = join(root, '.env.local');
  if (existsSync(local)) {
    for (const line of readFileSync(local, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*?)\s*$/);
      if (match && !line.trim().startsWith('#')) {
        env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  }
  return { ...env, ...process.env };
}

const env = envValues();
const apiKey = env.VITE_FIREBASE_API_KEY;
const projectId = env.VITE_FIREBASE_PROJECT_ID;
if (!apiKey || !/^AIza[0-9A-Za-z_-]{30,}$/.test(apiKey)) {
  throw new Error('VITE_FIREBASE_API_KEY fehlt in lokaler .env.local');
}
if (projectId !== 'password-manager-parola') {
  throw new Error('VITE_FIREBASE_PROJECT_ID muss password-manager-parola sein');
}

const config = 'export const FIREBASE_CONFIG = Object.freeze(' +
  JSON.stringify({ apiKey, projectId }) + ');\n';
const copies = [
  ['popup.html', join(source, 'popup.html')],
  ['popup.css', join(source, 'popup.css')],
  ['popup.mjs', join(source, 'popup.mjs')],
  ['vault.mjs', join(shared, 'vault.mjs')],
  ['firebase-rest.mjs', join(shared, 'firebase-rest.mjs')],
];
for (const target of ['chrome', 'firefox']) {
  const directory = join(output, target);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  for (const [name, file] of copies) {
    copyFileSync(file, join(directory, name));
  }
  const manifest = JSON.parse(readFileSync(join(source, 'manifest.' + target + '.json'), 'utf8'));
  if (manifest.manifest_version !== 3 || manifest.permissions.some(x => /<all_urls>/.test(x)) ||
      manifest.host_permissions?.some(x => /<all_urls>|https:\/\/\*\//.test(x))) {
    throw new Error('Too-broad extension permission detected');
  }
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(directory, 'config.mjs'), config, { flag: 'wx' });
  console.log('Parola ' + target + ' MV3 prepared: ' + directory);
}
console.log('No extension uploaded to a browser store. Check Firebase login, form capture, vault sync and Android backup on test data first.');
