/**
 * Build two local, unpacked MV3 packages with identical audited JS logic.
 * No remote JavaScript, no signing key, no service-account credential.
 * Firebase Web API key is client-public; it is not a Google Admin API key.
 *
 * node scripts/build-browser-extensions.mjs
 */
import { existsSync, readFileSync, rmSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { ZipFile } from 'yazl';
import { createWriteStream } from 'node:fs';
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

const oauthClientFormat = /^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;
const chromeOauthId = env.VITE_GOOGLE_CHROME_OAUTH_CLIENT_ID || '';
const firefoxOauthId = env.VITE_GOOGLE_FIREFOX_OAUTH_CLIENT_ID || '';
for (const id of [chromeOauthId, firefoxOauthId]) {
  if (id && !oauthClientFormat.test(id)) throw new Error('Google OAuth client ID has invalid format');
}
const copies = [
  ['popup.html', join(source, 'popup.html')],
  ['popup.css', join(source, 'popup.css')],
  ['popup.mjs', join(source, 'popup.mjs')],
  ['background.js', join(source, 'background.js')],
  ['watch-login.js', join(source, 'watch-login.js')],
  ['google-auth.mjs', join(shared, 'google-auth.mjs')],
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
  if (target === 'chrome' && chromeOauthId) {
    manifest.oauth2 = { client_id: chromeOauthId, scopes: ['openid', 'email', 'profile'] };
  }
  const locales = ['de', 'en'];
  for (const locale of locales) {
    const sourceLocale = join(source, '_locales', locale, 'messages.json');
    const outLocale = join(directory, '_locales', locale);
    if (!existsSync(sourceLocale)) throw new Error('Translation catalog missing: ' + locale);
    mkdirSync(outLocale, { recursive: true });
    copyFileSync(sourceLocale, join(outLocale, 'messages.json'));
  }
  const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png'];
  mkdirSync(join(directory, 'icons'), { recursive: true });
  for (const name of iconFiles) {
    const icon = join(source, 'icons', name);
    if (!existsSync(icon)) throw new Error('Store icon missing: ' + icon);
    copyFileSync(icon, join(directory, 'icons', name));
  }
  if (manifest.manifest_version !== 3 || manifest.permissions.some(x => /<all_urls>/.test(x)) ||
      manifest.host_permissions?.some(x => /<all_urls>|https:\/\/\*\//.test(x))) {
    throw new Error('Too-broad extension permission detected');
  }
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const perBrowserConfig = 'export const FIREBASE_CONFIG = Object.freeze(' +
    JSON.stringify({ apiKey, projectId,
      googleOAuthClientId: target === 'firefox' ? firefoxOauthId : chromeOauthId }) + ');\n';
  writeFileSync(join(directory, 'config.mjs'), perBrowserConfig, { flag: 'wx' });
  const zip = new ZipFile();
  for (const [name] of copies) zip.addFile(join(directory, name), name);
  for (const name of iconFiles) zip.addFile(join(directory, 'icons', name), 'icons/' + name);
  for (const locale of locales) {
    zip.addFile(join(directory, '_locales', locale, 'messages.json'), '_locales/' + locale + '/messages.json');
  }
  for (const name of ['manifest.json', 'config.mjs']) zip.addFile(join(directory, name), name);
  const archivePath = join(output, 'parola-' + target + '-dev-' + manifest.version + '.zip');
  const file = createWriteStream(archivePath);
  const completed = new Promise((resolve, reject) => {
    file.on('close', resolve);
    file.on('error', reject);
    zip.outputStream.on('error', reject);
  });
  zip.outputStream.pipe(file);
  zip.end();
  await completed;
  console.log('Parola ' + target + ' MV3 prepared: ' + archivePath);
  if (!(target === 'chrome' ? chromeOauthId : firefoxOauthId)) {
    console.warn('WARNING: Google OAuth client not configured for ' + target + '; Google sign-in requires Cloud OAuth setup.');
  }
}
console.log('No extension uploaded to a browser store. Check Firebase login, form capture, vault sync and Android backup on test data first.');
