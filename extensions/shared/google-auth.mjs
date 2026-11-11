/* Google -> Firebase auth for MV3. Two distinct providers:
 * Chrome: chrome.identity.getAuthToken (requires Chrome OAuth client tied to extension ID).
 * Firefox: browser.identity.launchWebAuthFlow with a dedicated OAuth client whose
 * exact redirect URL was registered in Google Cloud Console.
 * No Google password ever enters Parola code.
 */
const ext = globalThis.browser || globalThis.chrome;
function oauthState() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
}
async function googleAccessToken(config) {
  if (!ext.identity) throw new Error('Google-Anmeldung wird in diesem Browser nicht unterstützt');
  const m = ext.runtime.getManifest();
  if (m.oauth2?.client_id && typeof ext.identity.getAuthToken === 'function' &&
      !m.browser_specific_settings) {
    const response = await ext.identity.getAuthToken({
      interactive: true, scopes: ['openid', 'email', 'profile']
    });
    const token = typeof response === 'string' ? response : response?.token;
    if (!token) throw new Error('Google hat keinen Zugriffstoken zurückgegeben');
    return token;
  }
  if (!config.googleOAuthClientId) {
    throw new Error('Google OAuth ist für dieses Add-on noch nicht eingerichtet. Bitte die Client-ID konfigurieren.');
  }
  if (!ext.identity.getRedirectURL || !ext.identity.launchWebAuthFlow) {
    throw new Error('Der Browser unterstützt diesen Google-Login nicht.');
  }
  const redirect = ext.identity.getRedirectURL('parola');
  const state = oauthState();
  const params = new URLSearchParams({
    client_id: config.googleOAuthClientId,
    redirect_uri: redirect,
    response_type: 'token',
    scope: 'openid email profile',
    state, prompt: 'select_account'
  });
  const result = await ext.identity.launchWebAuthFlow({
    url: 'https://accounts.google.com/o/oauth2/v2/auth?' + params,
    interactive: true
  });
  if (!result || !result.startsWith(redirect + '#')) {
    throw new Error('Google hat die erwartete Weiterleitungsadresse nicht bestätigt');
  }
  const fragment = new URLSearchParams(new URL(result).hash.slice(1));
  if (fragment.get('state') !== state) {
    throw new Error('Ungültiger OAuth-Zustand: Login abgebrochen');
  }
  if (fragment.get('error')) throw new Error('Google-Login wurde abgebrochen');
  const token = fragment.get('access_token');
  if (!token || token.length > 8192) throw new Error('Google-Token fehlt');
  return token;
}

export async function signInGoogleWithFirebase(config) {
  if (!config?.apiKey || !config.projectId) throw new Error('Firebase-Konfiguration fehlt');
  const token = await googleAccessToken(config);
  try {
    const response = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=' +
      encodeURIComponent(config.apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestUri: 'http://localhost',
          postBody: new URLSearchParams({
            access_token: token, providerId: 'google.com'
          }).toString(),
          returnSecureToken: true,
          returnIdpCredential: false
        }),
        signal: AbortSignal.timeout(18000)
      }
    );
    const body = await response.json();
    if (!response.ok || !body.idToken || !body.refreshToken || !body.localId) {
      const code = String(body?.error?.message || response.status).slice(0, 90);
      throw new Error('Firebase-Google-Anmeldung fehlgeschlagen (' + code + ')');
    }
    return { provider: 'google.com', idToken: body.idToken, refreshToken: body.refreshToken, uid: body.localId,
      expiresAt: Date.now() + Math.max(60, Number(body.expiresIn) || 3600) * 1000 };
  } finally {
    // No Google access token is written into browser.storage.
    // It remains in this temporary function scope until GC.
  }
}
