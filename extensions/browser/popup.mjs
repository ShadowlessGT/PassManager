import { FIREBASE_CONFIG } from './config.mjs';
import { signInGoogleWithFirebase } from './google-auth.mjs';
import { signIn, refreshSession, readCloudVault, writeCloudVault } from './firebase-rest.mjs';
import { unlockKey, decryptVault, encryptVault, credentialsForPage, matchesWebsite, makeLoginEntry, replaceLogin } from './vault.mjs';

// Popup lifetime = unlocked lifetime. Never persist the master password,
// derived key, decrypted vault, captured login or a pending edit.
const ext = globalThis.browser || globalThis.chrome;
const $ = id => document.getElementById(id);
let authSession = null;
let vaultKey = null;
let vault = null;
let encryptedEnvelope = null;
let cloudRevision = null;
let pendingCapture = null;
let activePage = null;
let busy = false;
let activeWatchEnabled = false;
const reviewMode = new URLSearchParams(location.search).get('review') === '1';

function status(message, isError = false) {
  $('status').textContent = message;
  $('status').dataset.error = isError ? 'true' : 'false';
}
function showSection(id) {
  for (const part of ['login-section', 'unlock-section', 'vault-section']) {
    $(part).hidden = part !== id;
  }
  $('logout').hidden = id === 'login-section';
}
async function sessionStore() {
  if (!ext?.storage?.session) {
    throw new Error('Dieser Browser unterstützt keinen sicheren Sitzungs-Speicher');
  }
  return ext.storage.session;
}
async function saveSession(session) {
  authSession = session;
  (await sessionStore()).setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' }).catch?.(() => {});
  await (await sessionStore()).set({ parolaAuth: session });
}
async function validSession() {
  if (!authSession) {
    const saved = await (await sessionStore()).get('parolaAuth');
    authSession = saved?.parolaAuth || null;
  }
  if (!authSession) throw new Error('Bitte zuerst bei Firebase anmelden');
  const fresh = await refreshSession(FIREBASE_CONFIG, authSession);
  if (fresh.idToken !== authSession.idToken) await saveSession(fresh);
  return fresh;
}
async function tabForPage() {
  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  if (!Number.isInteger(tab?.id) || !tab.url) {
    throw new Error('Aktiven Tab nicht gefunden');
  }
  const url = new URL(tab.url);
  if (url.protocol !== 'https:') {
    throw new Error('Nur normale HTTPS-Webseiten werden unterstützt');
  }
  return { id: tab.id, url: url.href, origin: url.origin, hostname: url.hostname };
}
async function refreshPage() {
  try {
    if (reviewMode) {
      const result = await ext.runtime.sendMessage({ type: 'PAROLA_GET_PENDING_FROM_POPUP' });
      if (!result?.candidate) throw new Error('No pending login');
      const { origin, tabId } = result.candidate;
      const tab = await ext.tabs.get(tabId);
      if (new URL(tab.url).origin !== origin) throw new Error('Login page changed');
      activePage = { id: tabId, url: tab.url, origin, hostname: new URL(origin).hostname };
      $('site-label').textContent = activePage.hostname;
      return;
    }
    activePage = await tabForPage();
    $('site-label').textContent = activePage.hostname;
    await updateWatchUi();
  } catch {
    activePage = null;
    $('site-label').textContent = 'Kein unterstützter HTTPS-Tab geöffnet';
  }
}
function watchRegistrationId(origin) {
  // Stable per-domain ID; avoid putting hostname in extension registration IDs.
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(origin))
    .then(buffer => 'parola-' + Array.from(new Uint8Array(buffer)).slice(0, 12)
      .map(b => b.toString(16).padStart(2, '0')).join(''));
}
async function updateWatchUi() {
  const btn = $('watch-site');
  if (!btn) return;
  btn.hidden = !activePage || reviewMode;
  if (!activePage || reviewMode) return;
  const saved = await ext.storage.local.get('parolaAllowedOrigins');
  activeWatchEnabled = (saved.parolaAllowedOrigins || []).includes(activePage.origin) &&
    await ext.permissions.contains({ origins: [activePage.origin + '/*'] });
  btn.textContent = activeWatchEnabled
    ? 'Automatische Login-Nachfrage auf dieser Website deaktivieren'
    : 'Automatische Login-Nachfrage auf dieser Website erlauben';
}
async function loadPendingAfterUnlock() {
  if (!reviewMode) return;
  const result = await ext.runtime.sendMessage({ type: 'PAROLA_GET_PENDING_FROM_POPUP' });
  const pending = result?.candidate;
  if (!pending || !activePage || pending.origin !== activePage.origin ||
      pending.tabId !== activePage.id) return;
  pendingCapture = { ...pending, siteUrl: pending.origin };
  $('review-site').textContent = pending.origin;
  $('review-username').value = pending.username;
  $('review-password').value = pending.password;
  $('review').hidden = false;
  status('Login erkannt. Erst nach der Bestätigung wird verschlüsselt gespeichert.');
}

function drawMatches() {
  const container = $('matches');
  container.replaceChildren();
  if (!vault || !activePage) {
    container.textContent = 'Keine Webseite verfügbar.';
    return;
  }
  const matches = credentialsForPage(vault.entries, activePage.url);
  if (!matches.length) {
    container.textContent = 'Noch kein gespeicherter Login für diese genaue Domain.';
    return;
  }
  for (const item of matches.slice(0, 30)) {
    const line = document.createElement('div');
    line.className = 'match';
    const label = document.createElement('span');
    label.textContent = item.username || item.email || item.title || 'Login';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Einfüllen';
    button.addEventListener('click', () => safeRun(async () => {
      const page = await tabForPage();
      if (!matchesWebsite(String(item.website || ''), page.url)) {
        throw new Error('Domain hat gewechselt. Passwort wurde nicht eingefüllt.');
      }
      const result = await ext.scripting.executeScript({
        target: { tabId: page.id },
        func: fillPageCredentials,
        args: [item.username || item.email || '', item.password, page.origin]
      });
      if (result?.[0]?.result !== true) {
        throw new Error('Kein passendes sichtbares Login-Formular erkannt');
      }
      status('Login-Felder eingefüllt. Absenden musst du selbst.');
    }));
    line.append(label, button);
    container.append(line);
  }
}
function clearReview() {
  pendingCapture = null;
  $('review-password').value = '';
  $('review-username').value = '';
  $('review-site').textContent = '';
  $('review').hidden = true;
}
function lockVault() {
  vaultKey = null; vault = null;
  encryptedEnvelope = null; cloudRevision = null;
  clearReview();
  $('master-password').value = '';
  showSection(authSession ? 'unlock-section' : 'login-section');
}
async function safeRun(operation) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(b => { b.disabled = true; });
  try { await operation(); }
  catch (error) { status(String(error?.message || 'Unbekannter Fehler'), true); }
  finally {
    busy = false;
    document.querySelectorAll('button').forEach(b => { b.disabled = false; });
  }
}

function readPageCredentials() {
  // Executed in the user-selected active tab ONLY after clicking "Erkennen".
  const visible = input => {
    if (input.disabled || input.readOnly || input.type === 'hidden') return false;
    const style = window.getComputedStyle(input);
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      input.getClientRects().length > 0;
  };
  const inputs = Array.from(document.querySelectorAll('input')).filter(visible);
  const passwords = inputs.filter(i => i.type === 'password' &&
    i.autocomplete !== 'one-time-code' && i.autocomplete !== 'new-password' && i.value);
  if (passwords.length !== 1) {
    return { error: 'Es muss genau ein sichtbares, ausgefülltes Login-Passwortfeld vorhanden sein.' };
  }
  const passwordInput = passwords[0];
  const container = passwordInput.form || passwordInput.closest('section') || document;
  const candidates = inputs.filter(i => container.contains(i) && i !== passwordInput &&
    ['text', 'email', 'tel', ''].includes(i.type) && i.value);
  const username = candidates.find(i => i.autocomplete === 'username') ||
    candidates.find(i => i.type === 'email') ||
    candidates.find(i => /user|login|mail/i.test(i.name + ' ' + i.id)) ||
    candidates[0];
  if (!username?.value) return { error: 'Kein ausgefüllter Benutzername erkannt.' };
  if (passwordInput.value.length > 8192 || username.value.length > 512) {
    return { error: 'Die Eingabewerte sind zu lang.' };
  }
  return {
    username: username.value, password: passwordInput.value,
    siteUrl: location.origin
  };
}

function fillPageCredentials(username, password, expectedOrigin) {
  // Re-check inside the page, even if navigation happened after popup opened.
  if (location.protocol !== 'https:' || location.origin !== expectedOrigin) return false;
  const visible = i => {
    if (i.disabled || i.readOnly) return false;
    const style = window.getComputedStyle(i);
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      i.getClientRects().length > 0;
  };
  const all = Array.from(document.querySelectorAll('input')).filter(visible);
  const pw = all.find(i => i.type === 'password' && i.autocomplete !== 'new-password');
  if (!pw) return false;
  const form = pw.form || pw.closest('section') || document;
  const candidates = all.filter(i => form.contains(i) && i !== pw &&
    ['text', 'email', 'tel', ''].includes(i.type));
  const user = candidates.find(i => i.autocomplete === 'username') ||
    candidates.find(i => i.type === 'email') ||
    candidates.find(i => /user|login|mail/i.test(i.name + ' ' + i.id)) ||
    candidates[0];
  const set = (element, value) => {
    if (!element) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (!descriptor?.set) return;
    descriptor.set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set(user, username);
  set(pw, password);
  return true; // Never submit the form.
}

$('login-form').addEventListener('submit', e => {
  e.preventDefault();
  void safeRun(async () => {
    const password = $('account-password').value;
    try {
      await saveSession(await signIn(FIREBASE_CONFIG, $('email').value.trim(), password));
    } finally { $('account-password').value = ''; }
    showSection('unlock-section');
    status('Firebase verbunden. Bitte den Cloud-Tresor mit deinem Master-Passwort öffnen.');
  });
});

async function unlock() {
  const session = await validSession();
  const remote = await readCloudVault(FIREBASE_CONFIG, session);
  const key = await unlockKey($('master-password').value, remote.envelope);
  let plaintext;
  try { plaintext = await decryptVault(remote.envelope, key); }
  catch { throw new Error('Master-Passwort falsch oder Cloud-Tresor beschädigt'); }
  encryptedEnvelope = remote.envelope;
  cloudRevision = remote.updateTime;
  vaultKey = key;
  vault = plaintext;
  $('master-password').value = '';
  await refreshPage();
  showSection('vault-section');
  drawMatches();
  status('Verschlüsselten Cloud-Tresor geöffnet. ' + vault.entries.length + ' Einträge.');
  await loadPendingAfterUnlock();
}
$('unlock-form').addEventListener('submit', e => {
  e.preventDefault();
  void safeRun(unlock);
});
$('reload').addEventListener('click', () => { lockVault(); status('Cloud-Stand aktualisieren: Master-Passwort erneut eingeben.'); });
$('lock').addEventListener('click', () => {
  lockVault();
  status('Tresor gesperrt. Schlüssel aus dem geöffneten Fenster entfernt.');
});
$('logout').addEventListener('click', () => safeRun(async () => {
  await (await sessionStore()).remove('parolaAuth');
  await ext.runtime.sendMessage({ type: 'PAROLA_CLEAR_PENDING_FROM_POPUP' });
  authSession = null;
  lockVault();
  status('Firebase-Sitzung beendet.');
}));
$('capture').addEventListener('click', () => safeRun(async () => {
  if (!vaultKey || !vault) throw new Error('Tresor ist gesperrt');
  const page = await tabForPage();
  const result = await ext.scripting.executeScript({
    target: { tabId: page.id }, func: readPageCredentials
  });
  const captured = result?.[0]?.result;
  if (!captured || captured.error) throw new Error(captured?.error || 'Kein Login erkannt');
  if (captured.siteUrl !== page.origin) {
    throw new Error('Domainwechsel erkannt; Zugangsdaten verworfen');
  }
  pendingCapture = captured;
  $('review-site').textContent = captured.siteUrl;
  $('review-username').value = captured.username;
  $('review-password').value = captured.password;
  $('review').hidden = false;
  status('Login erkannt. Erst mit „Verschlüsselt in Firebase speichern“ bestätigen.');
}));
$('cancel').addEventListener('click', () => {
  if (reviewMode) void ext.runtime.sendMessage({ type: 'PAROLA_CLEAR_PENDING_FROM_POPUP' });
  clearReview(); status('Übernahme verworfen.');
});
$('google-login').addEventListener('click', () => safeRun(async () => {
  const session = await signInGoogleWithFirebase(FIREBASE_CONFIG);
  await saveSession(session);
  showSection('unlock-section');
  status('Google-Konto über Firebase bestätigt. Jetzt Parola-Master-Passwort eingeben.');
}));
$('watch-site').addEventListener('click', () => {
  if (!vault || !authSession || !activePage || reviewMode) return;
  if (authSession.provider !== 'google.com') {
    status('Für automatische Login-Nachfragen bitte mit Google bei Firebase anmelden.', true);
    return;
  }
  const origin = activePage.origin;
  // Browser permission request is invoked immediately in a genuine user click.
  const permissionPromise = activeWatchEnabled
    ? Promise.resolve(true)
    : ext.permissions.request({ origins: [origin + '/*'] });
  void safeRun(async () => {
    const ok = await permissionPromise;
    if (!ok) throw new Error('Webseitenzugriff wurde nicht erlaubt.');
    const saved = await ext.storage.local.get('parolaAllowedOrigins');
    const origins = new Set(saved.parolaAllowedOrigins || []);
    const id = await watchRegistrationId(origin);
    if (activeWatchEnabled) {
      origins.delete(origin);
      await ext.storage.local.set({ parolaAllowedOrigins: [...origins] });
      try { await ext.scripting.unregisterContentScripts({ ids: [id] }); }
      catch { /* May have been removed by extension update */ }
      await ext.permissions.remove({ origins: [origin + '/*'] });
      status('Automatische Login-Erkennung für diese Website deaktiviert.');
    } else {
      const old = await ext.scripting.getRegisteredContentScripts({ ids: [id] });
      if (!old.length) await ext.scripting.registerContentScripts([{
        id, matches: [origin + '/*'], js: ['watch-login.js'],
        runAt: 'document_idle', allFrames: false, persistAcrossSessions: true
      }]);
      origins.add(origin);
      await ext.storage.local.set({ parolaAllowedOrigins: [...origins] });
      await ext.scripting.executeScript({ target: { tabId: activePage.id }, files: ['watch-login.js'] });
      status('Für diese Website aktiviert: Nach Login-Versuchen fragt Parola nach.');
    }
    await updateWatchUi();
  });
});
$('save').addEventListener('click', () => safeRun(async () => {
  if (!vault || !vaultKey || !encryptedEnvelope || !cloudRevision || !pendingCapture) {
    throw new Error('Kein entsperrter Tresor oder keine geprüfte Vorschau');
  }
  const page = reviewMode ? activePage : await tabForPage();
  if (!page || pendingCapture.siteUrl !== page.origin ||
      new URL((await ext.tabs.get(page.id)).url).origin !== page.origin) {
    throw new Error('Die Webseite hat gewechselt, Speichern wurde abgebrochen');
  }
  const username = $('review-username').value.trim();
  const password = $('review-password').value;
  const incoming = makeLoginEntry({ siteUrl: page.origin, username, password });
  const previous = vault.entries.find(e =>
    matchesWebsite(String(e.website || ''), page.url) &&
    (e.username || e.email) === username
  );
  if (previous && !window.confirm('Bereits vorhandenen Login für diese Webseite und diesen Benutzer aktualisieren?')) {
    throw new Error('Überschreiben abgebrochen');
  }
  const updatedEntry = previous ? replaceLogin(previous, username, password) : incoming;
  const updatedVault = {
    ...vault,
    entries: previous
      ? vault.entries.map(e => e.id === previous.id ? updatedEntry : e)
      : [...vault.entries, updatedEntry]
  };
  // Reuses the Android AES-GCM envelope and the existing salt/master-derived key.
  const encrypted = await encryptVault(updatedVault, vaultKey, encryptedEnvelope.salt);
  const session = await validSession();
  await writeCloudVault(FIREBASE_CONFIG, session, encrypted, cloudRevision);
  if (reviewMode) await ext.runtime.sendMessage({ type: 'PAROLA_CLEAR_PENDING_FROM_POPUP' });
  clearReview();
  lockVault(); // Re-unlock is required to fetch the new revision and avoid stale edits.
  status('Login verschlüsselt in Firebase gespeichert. Auf Android Cloud-Tresor erneut herunterladen.');
}));

window.addEventListener('pagehide', () => {
  vaultKey = null; vault = null; pendingCapture = null;
  encryptedEnvelope = null; cloudRevision = null;
});

(async () => {
  try {
    await refreshPage();
    await validSession();
    showSection('unlock-section');
    status('Firebase-Sitzung vorhanden. Bitte Master-Passwort eingeben.');
  } catch {
    authSession = null;
    showSection('login-section');
    status('Bitte mit deinem Parola-Firebase-Konto anmelden.');
  }
})();
