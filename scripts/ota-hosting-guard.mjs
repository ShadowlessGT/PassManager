/**
 * Firebase Hosting predeploy gate. An unpublished OTA manifest may never be
 * made live accidentally by a normal firebase deploy.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const manifestPath = resolve('ota-public', 'ota', 'android', 'stable.json');
if (!existsSync(manifestPath)) {
  console.log('Parola OTA Hosting: no signed release manifest. Safe, empty OTA channel.');
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const version = manifest?.release?.version;
  if (typeof version !== 'string' || process.env.PAROLA_OTA_DEPLOY_APPROVED !== version) {
    throw new Error(
      'REFUSING Firebase Hosting deployment: signed OTA ' + String(version)
      + ' is staged in ota-public. Explicit approval needed: '
      + 'PAROLA_OTA_DEPLOY_APPROVED=' + String(version),
    );
  }
  execFileSync(process.execPath, [resolve('scripts', 'ota-verify.mjs'), '--public'], { stdio: 'inherit' });
  console.log('Parola OTA Hosting: explicit release approval verified for ' + version);
}
