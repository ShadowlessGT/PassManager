import { initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { fromJSON64, validPublicJwk, validRedirect, validState, sealSession } from '../extensions/shared/google-handoff.mjs';

const $ = id => document.getElementById(id);
const options = new URLSearchParams(location.search);
const state = options.get('state'), redirect = options.get('redirect'), key = options.get('key');
const allowed = String(import.meta.env.VITE_PAROLA_APPROVED_EXTENSION_REDIRECTS || '')
  .split(',').map(x => x.trim()).filter(Boolean);
let verified = false;
try {
  if (!validRedirect(redirect) || !validState(state) || !validPublicJwk(fromJSON64(key)) ||
      !allowed.includes(redirect)) throw new Error('Erweiterung ist nicht freigegeben.');
  verified = true;
} catch {
  $('status').textContent = 'Nicht autorisierte oder unvollständige Erweiterung. Anmeldung gesperrt.';
}
if (verified) {
  $('authorize').disabled = false;
  $('status').textContent = 'Bereit. Bitte das Google-Konto bestätigen.';
}
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
});
const auth = getAuth(app);
let running = false;
$('authorize').addEventListener('click', async () => {
  if (!verified || running) return;
  running = true;
  $('authorize').disabled = true;
  $('status').textContent = 'Google-Anmeldung wird geöffnet.';
  try {
    await setPersistence(auth, inMemoryPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt:'select_account' });
    const result = await signInWithPopup(auth,provider);
    const user = result.user;
    const token = await user.getIdTokenResult();
    const session = {
      provider:'google.com', idToken:token.token, refreshToken:user.refreshToken,
      uid:user.uid, expiresAt:Date.parse(token.expirationTime)
    };
    // Encrypt the Firebase bearer credentials to the public key generated inside
    // the extension for this individual login. The website never gets the
    // extension's private key; neither the server nor redirect URL sees cleartext.
    const sealed = await sealSession(session,{state,redirect,key});
    await signOut(auth);
    $('status').textContent = 'Google-Anmeldung bestätigt. Zurück zu Parola.';
    location.replace(sealed);
  } catch (error) {
    try {await signOut(auth);}catch{}
    const code = String(error?.code || error?.message || 'Unbekannter Fehler');
    $('status').textContent = 'Anmeldung fehlgeschlagen: '+code.slice(0,110);
    $('authorize').disabled = false;
    running = false;
  }
});
