/**
 * Parola Google Play Store uploader.
 * Uses an ephemeral IAM Credentials token. Never creates or stores a key file.
 * Modes: --check (offline validation), --probe (auth, no publication), --upload.
 * Uses existing central Shadowless Play Automation service account.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const mode = process.argv[2] || '--check';
if (!['--check', '--probe', '--upload'].includes(mode)) {
  console.error('Usage: node scripts/play-store-upload.mjs [--check|--probe|--upload]');
  process.exit(2);
}
const app = 'com.shadowlessstudios.passwordmanager';
const serviceAccount = process.env.PAROLA_PLAY_SERVICE_ACCOUNT || 'shadowless-play-automation@shadowless-bridge.iam.gserviceaccount.com';
const mediaDir = process.env.PAROLA_PLAY_MEDIA_DIR || 'H:\\Meine Ablage\\Sharing\\Parola-PlayStore-EN';
const textsFile = path.join(mediaDir, 'store-texts', 'localizations.json');
const icon = path.join(mediaDir, 'Parola-Google-Play-Icon-512.png');
const images = [
  '01_secure_vault_EN.png',
  '02_all_your_logins_EN.png',
  '03_password_generator_EN.png',
  '04_security_insights_EN.png',
  '05_easy_import_EN.png',
  '06_easy_customization_EN.png',
  '07_organize_categories_EN.png',
].map(name => path.join(mediaDir, name));

function inspectPng(filename, expectedWidth, expectedHeight) {
  const buffer = fs.readFileSync(filename);
  if (buffer.length < 1000 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`Invalid PNG: ${filename}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`${path.basename(filename)}: ${width}x${height}; expected ${expectedWidth}x${expectedHeight}`);
  }
  return buffer;
}
function validateStoreTexts() {
  if (!fs.existsSync(textsFile)) throw new Error(`Missing translations: ${textsFile}`);
  const original = JSON.parse(fs.readFileSync(textsFile, 'utf8').replace(/^\uFEFF/, ''));
  const aliases = { 'id-ID': 'id', 'ur-PK': 'ur', 'vi-VN': 'vi', 'sw-KE': 'sw', 'th-TH': 'th' };
  const data = Object.fromEntries(Object.entries(original).map(([code, row]) => [aliases[code] || code, row]));
  if (Object.keys(data).length !== 20 || !data['en-US']) throw new Error('Expected 20 locales including en-US');
  for (const [locale, listing] of Object.entries(data)) {
    if (!/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(locale)) throw new Error(`Locale invalid: ${locale}`);
    for (const [field, max] of [['title', 30], ['shortDescription', 80], ['fullDescription', 4000]]) {
      const value = listing[field];
      const n = typeof value === 'string' ? Array.from(value).length : 0;
      if (n < 1 || n > max) throw new Error(`${locale}.${field}: ${n} characters, max ${max}`);
    }
  }
  inspectPng(icon, 512, 512);
  for (const f of images) inspectPng(f, 1080, 1920);
  console.log(`OK: ${Object.keys(data).length} localized listings, ${images.length} English phone screenshots, one 512px English app icon.`);
  console.log(`App: ${app}`);
  return data;
}
async function fetchJson(method, url, token, payload) {
  const headers = { Authorization: `Bearer ${token}` };
  let body;
  if (Buffer.isBuffer(payload)) {
    headers['Content-Type'] = 'image/png';
    body = payload;
  } else if (payload !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    body = JSON.stringify(payload);
  }
  const response = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(60000) });
  const text = await response.text();
  if (!response.ok) {
    let message = text.slice(0, 260);
    try { message = JSON.parse(text).error?.message || message; } catch {}
    throw new Error(`HTTP ${response.status} on ${method} ${url.split('?')[0]}: ${message.slice(0, 260)}`);
  }
  try { return text ? JSON.parse(text) : {}; } catch { return {}; }
}
function getUserCloudToken() {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'gcloud';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'gcloud auth print-access-token']
    : ['auth', 'print-access-token'];
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
async function getPlayToken() {
  const userToken = getUserCloudToken();
  const uri = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`;
  const result = await fetchJson('POST', uri, userToken, {
    scope: ['https://www.googleapis.com/auth/androidpublisher'],
    lifetime: '3600s',
  });
  if (!result.accessToken) throw new Error('IAM token service returned no OAuth token');
  return result.accessToken;
}
async function main() {
  const all = validateStoreTexts();
  if (mode === '--check') return;
  let token;
  try { token = await getPlayToken(); }
  catch (e) {
    throw new Error(`Play API authentication unavailable. Grant Token Creator on ${serviceAccount} to the active Google identity. Details: ${e.message}`);
  }
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${app}/edits`;
  let edit;
  try { edit = await fetchJson('POST', base, token, {}); }
  catch (e) {
    throw new Error(`Play Console API access unavailable. The service account requires Parola app permission "Manage store presence". Details: ${e.message}`);
  }
  const editBase = `${base}/${edit.id}`;
  if (mode === '--probe') {
    console.log('Play Publisher access confirmed. No listings or images modified.');
    await fetchJson('DELETE', editBase, token);
    return;
  }
  const changed = [], rejected = [];
  console.log('Play Store edit started. Writing 20 localized text listings.');
  for (const [locale, row] of Object.entries(all)) {
    const value = {
      language: locale,
      title: row.title,
      shortDescription: row.shortDescription,
      fullDescription: row.fullDescription,
    };
    try {
      await fetchJson('PUT', `${editBase}/listings/${encodeURIComponent(locale)}`, token, value);
      changed.push(locale);
      console.log(`Listing ${locale}: uploaded`);
    } catch (e) {
      rejected.push({ locale, reason: e.message });
      console.log(`Listing ${locale}: REJECTED (see report)`);
    }
  }
  if (!changed.includes('en-US')) throw new Error('English base listing was not accepted; aborting without commit');
  // Do not touch any other language's images. Replace English-only icon and screenshots.
  for (const [type, paths] of [['icon', [icon]], ['phoneScreenshots', images]]) {
    const route = `${editBase}/listings/en-US/${type}`;
    await fetchJson('DELETE', route, token);
    for (const file of paths) {
      const upload = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${app}/edits/${edit.id}/listings/en-US/${type}?uploadType=media`;
      await fetchJson('POST', upload, token, fs.readFileSync(file));
      console.log(`en-US/${type}: ${path.basename(file)} uploaded`);
    }
    const result = await fetchJson('GET', route, token);
    if ((result.images?.length || 0) !== paths.length) {
      throw new Error(`Image verification mismatch for ${type}: expected ${paths.length}, got ${result.images?.length || 0}. No commit.`);
    }
  }
  const after = await fetchJson('GET', `${editBase}/listings`, token);
  const confirmed = new Set((after.listings || []).map(x => x.language));
  for (const locale of changed) {
    if (!confirmed.has(locale)) rejected.push({ locale, reason: 'Not present after upload: may be unsupported by Google Play' });
  }
  await fetchJson('POST', `${editBase}:validate`, token, {});
  const commit = await fetchJson('POST', `${editBase}:commit`, token, {});
  const report = {
    packageName: app,
    submittedLocales: changed,
    confirmedLocales: [...confirmed],
    rejectedLocales: rejected,
    uploadedEnglishScreenshots: images.map(x => path.basename(x)),
    uploadedEnglishIcon: path.basename(icon),
    editId: edit.id,
    committedAt: new Date().toISOString(),
    commit,
  };
  const reportPath = path.join(mediaDir, 'play-upload-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`DONE: Play edit committed. Locales confirmed ${changed.filter(x => confirmed.has(x)).length}/20. English images 7, icon 1.`);
  console.log(`Report: ${reportPath}`);
  if (rejected.length) {
    console.log(`ATTENTION: ${rejected.length} locales were not confirmed; see report. No screenshots in other languages were touched.`);
  }
}

main().catch(e => { console.error('UPLOAD NOT COMPLETED: ' + e.message); process.exitCode = 1; });
