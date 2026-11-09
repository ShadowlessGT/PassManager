/**
 * Locally package and sign a Parola HTML/CSS/JS release for Firebase Hosting.
 * Does NOT deploy, modify Play Console, or update a user's phone.
 *
 * npm run ota:bundle -- --version 0.7.3 --notes "Kleine Verbesserungen"
 * firebase deploy --only hosting --project password-manager-parola  (after QA)
 *
 * Keep private key OFF GitHub / hosting / Android APK / build output.
 */
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { once } from 'node:events';
import yazl from 'yazl';

const root = resolve('.');
const nativeMinDefault = 19;
const nativeMaxDefault = 19;
const origin = 'https://password-manager-parola.web.app';
const argumentsList = process.argv.slice(2);
function arg(name, fallback) {
  const index = argumentsList.indexOf(name);
  if (index < 0) return fallback;
  if (!argumentsList[index + 1]) throw new Error('Value missing after ' + name);
  return argumentsList[index + 1];
}
const version = arg('--version');
const notes = arg('--notes', '');
const minNativeCode = Number(arg('--min-native-code', String(nativeMinDefault)));
const maxNativeCode = Number(arg('--max-native-code', String(nativeMaxDefault)));
if (!version || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error('Provide a numeric semantic web release: --version 0.7.3');
}
if (!Number.isSafeInteger(minNativeCode) || !Number.isSafeInteger(maxNativeCode)
  || minNativeCode < 1 || maxNativeCode < minNativeCode) throw new Error('Invalid native versionCode range');
if (notes.length > 240) throw new Error('Release note is too long (max 240 characters).');

const builtInVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
function parts(v) { return v.split('.').map(Number); }
const current = parts(builtInVersion), proposed = parts(version);
if (proposed.some((part, i) => part > current[i] && proposed.slice(0, i).every((p,j) => p === current[j])) === false) {
  throw new Error('OTA web version must exceed the built-in version ' + builtInVersion);
}

// Missing environment values could accidentally publish a working UI that
// silently disables Firebase cloud backup and cloud license checks.
const localEnv = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
for (const name of ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']) {
  if (!process.env[name] && !new RegExp('^' + name + '=.+', 'm').test(localEnv)) {
    throw new Error('Cannot sign a production OTA without ' + name + ' in .env.local / environment');
  }
}

const distDir = join(root, 'dist');
if (!existsSync(join(distDir, 'index.html'))) throw new Error('Missing dist/index.html. Run npm run build first.');
const privateKeyPath = resolve(process.env.PAROLA_OTA_PRIVATE_KEY
  || join(homedir(), 'Documents', 'Parola-OTA-Signing', 'parola-ota-ecdsa-p256-private.pem'));
if (!existsSync(privateKeyPath)) throw new Error('Private signing key not found at ' + privateKeyPath);
const privateKey = createPrivateKey(readFileSync(privateKeyPath, 'utf8'));
const publicJwk = createPublicKey(privateKey).export({ format: 'jwk' });
const checkedInPublicKey = readFileSync(join(root, 'src', 'otaPublicKey.ts'), 'utf8');
const match = checkedInPublicKey.match(/PAROLA_OTA_PUBLIC_KEY: JsonWebKey = (\{[\s\S]*?\});/);
if (!match) throw new Error('Public verification key was not found in the application');
const pinned = JSON.parse(match[1]);
if (publicJwk.x !== pinned.x || publicJwk.y !== pinned.y || publicJwk.crv !== pinned.crv) {
  throw new Error('Signing private key does not match pinned Android public key');
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symlinks are forbidden in OTA bundle: ' + path);
      if (entry.isDirectory()) return filesUnder(path);
      if (!entry.isFile()) throw new Error('Nonregular file forbidden: ' + path);
      return [path];
    });
}

const outDir = join(root, 'ota-staging', 'ota', 'android');
mkdirSync(join(outDir, 'bundles'), { recursive: true });
const tmpZip = join(outDir, 'bundles', '.parola-ota-' + process.pid + '.zip');
const zip = new yazl.ZipFile();
for (const absolutePath of filesUnder(distDir)) {
  const rel = relative(distDir, absolutePath).split(sep).join('/');
  zip.addFile(absolutePath, rel, { mtime: new Date('2026-01-01T00:00:00.000Z') });
}
const out = createWriteStream(tmpZip, { flags: 'wx' });
zip.outputStream.pipe(out);
zip.end();
await once(out, 'close');
const sizeBytes = statSync(tmpZip).size;
if (sizeBytes < 100 || sizeBytes > 80 * 1024 * 1024) {
  unlinkSync(tmpZip);
  throw new Error('Unsafe OTA zip size: ' + sizeBytes);
}
const digest = await new Promise((resolveHash, reject) => {
  const hasher = createHash('sha256');
  const input = createReadStream(tmpZip);
  input.on('data', chunk => hasher.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolveHash(hasher.digest('hex')));
});
const zipName = 'parola-web-' + version + '-' + digest.slice(0, 16) + '.zip';
const zipPath = join(outDir, 'bundles', zipName);
if (existsSync(zipPath)) {
  unlinkSync(tmpZip);
  throw new Error('Version already packaged. Use a new release version: ' + zipPath);
}

const release = {
  version,
  minNativeCode,
  maxNativeCode,
  publishedAt: new Date().toISOString(),
  zipUrl: origin + '/ota/android/bundles/' + zipName,
  sha256: digest,
  sizeBytes,
  notes,
};
const stablePath = join(outDir, 'stable.json');
if (existsSync(stablePath)) {
  const old = JSON.parse(readFileSync(stablePath, 'utf8'));
  const a = parts(old.release.version);
  const b = parts(release.version);
  for (let i = 0; i < 3; i++) {
    if (b[i] < a[i]) throw new Error('Refusing to downgrade the OTA release channel');
    if (b[i] > a[i]) break;
    if (i === 2) throw new Error('Refusing to republish the exact same OTA version');
  }
}
const canonical = JSON.stringify([
  'parola-ota-manifest-v1',
  release.version, release.minNativeCode, release.maxNativeCode,
  release.publishedAt, release.zipUrl, release.sha256, release.sizeBytes, release.notes,
]);
const signature = sign('sha256', Buffer.from(canonical, 'utf8'),
  { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
const manifest = { schema: 1, release, signature };
renameSync(tmpZip, zipPath);
writeFileSync(stablePath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'w' });
console.log('SIGNED release packaged locally (NOT deployed):');
console.log('Version: ' + version + ', native versionCode: ' + minNativeCode + '..' + maxNativeCode);
console.log('Zip: ' + zipPath);
console.log('SHA-256: ' + digest);
console.log('Manifest: ' + stablePath);
console.log('Do NOT deploy until real Android smoke tests and a review are completed.');
