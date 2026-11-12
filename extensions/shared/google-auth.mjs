// Shared Google -> Firebase sign-in for Chrome and Firefox.
// A trusted Parola hosted page uses the existing Firebase Google provider.
// Firebase bearer credentials return encrypted for this single login via ECDH.
// No extra browser OAuth client ID or Google service-account secret is embedded.
import { newChallenge, openSession } from './google-handoff.mjs';

async function verifyFirebaseIdentity(config, session) {
  if (typeof config?.apiKey !== 'string' || !/^AIza[A-Za-z0-9_-]{30,}$/.test(config.apiKey))
    throw new Error('Fehlende Firebase-Konfiguration');
  const response = await fetch(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(config.apiKey), {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({idToken:session.idToken}),
      signal:AbortSignal.timeout(15000)
    });
  if(!response.ok) throw new Error('Firebase konnte die Google-Anmeldung nicht bestätigen');
  const body=await response.json();
  const user=Array.isArray(body.users)&&body.users.length===1?body.users[0]:null;
  if (!user || user.localId!==session.uid ||
      !Array.isArray(user.providerUserInfo) ||
      !user.providerUserInfo.some(p=>p.providerId==='google.com')) {
    throw new Error('Google-Konto stimmt nicht mit Firebase überein');
  }
  return session;
}
export async function signInGoogleWithFirebase(config) {
  if (config?.projectId !== 'password-manager-parola')
    throw new Error('Unbekanntes Firebase-Projekt');
  const ext=globalThis.browser||globalThis.chrome;
  if(!ext?.identity?.getRedirectURL||!ext.identity.launchWebAuthFlow)
    throw new Error('Der Browser unterstützt den sicheren Google-Anmeldeweg nicht');
  const redirect=ext.identity.getRedirectURL('parola');
  const challenge=await newChallenge(redirect);
  const result=await ext.identity.launchWebAuthFlow({url:challenge.url,interactive:true});
  const session=await openSession(result,challenge);
  return verifyFirebaseIdentity(config,session);
}
