/**
 * EXPLICIT promotion of an Android-tested, signed candidate to the local
 * Hostinger OTA upload staging folder. This script does NOT deploy.
 *
 * node scripts/ota-stage-hostinger.mjs --version 0.7.3 --approve-tested-android-update
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const versionIndex = args.indexOf('--version');
const version = versionIndex >= 0 ? args[versionIndex + 1] : null;
if (!version || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)
  || !args.includes('--approve-tested-android-update')) {
  throw new Error('Explicit QA approval required: --version X.Y.Z --approve-tested-android-update');
}
const staging = resolve('ota-staging', 'ota', 'android');
const manifest = JSON.parse(readFileSync(join(staging, 'stable.json'), 'utf8'));
if (manifest.release.version !== version) {
  throw new Error('Requested version and signed staged manifest version do not match.');
}
execFileSync(process.execPath, [resolve('scripts', 'ota-verify.mjs')], { stdio: 'inherit' });
const dst = resolve('ota-public', 'ota', 'android');
mkdirSync(join(dst, 'bundles'), { recursive: true });
const filename = basename(new URL(manifest.release.zipUrl).pathname);
const srcZip = join(staging, 'bundles', filename);
if (!existsSync(srcZip)) throw new Error('Signed zip missing');
copyFileSync(srcZip, join(dst, 'bundles', filename));
// Update the mutable stable channel last; older zip assets are preserved.
copyFileSync(join(staging, 'stable.json'), join(dst, 'stable.json'));
console.log('Approved signed OTA staged for deployment: ' + version);
console.log('NEXT STEP (read only): npm run ota:probe');
console.log('After real Android QA: npm run ota:publish -- --version ' + version + ' --approve-tested-android-update');
console.log('WARNING: Only do so AFTER confirming live Android QA and protected vault backups.');
