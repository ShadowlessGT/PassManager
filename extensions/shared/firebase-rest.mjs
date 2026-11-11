/*
 * WebExtension-safe Firebase REST adapter. No external scripts or SDK runtime.
 * Firestore only ever receives the same encrypted envelope Android already uses.
 * The write precondition rejects concurrent changes instead of silently losing data.
 */
const IDENTITY = 'https://identitytoolkit.googleapis.com/v1';
const SECURE_TOKEN = 'https://securetoken.googleapis.com/v1';
const FIRESTORE = 'https://firestore.googleapis.com/v1';

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(16000)
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = {}; }
  if (!response.ok) {
    const code = data?.error?.status || data?.error?.message || response.status;
    const error = new Error('Firebase-Anfrage fehlgeschlagen (' + String(code).slice(0, 70) + ')');
    error.httpStatus = response.status;
    throw error;
  }
  return data;
}

export async function signIn(config, email, password) {
  if (!config?.apiKey || !config?.projectId) throw new Error('Firebase-Konfiguration fehlt');
  const data = await jsonRequest(IDENTITY + '/accounts:signInWithPassword?key=' +
    encodeURIComponent(config.apiKey), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  if (!data.idToken || !data.refreshToken || !data.localId) throw new Error('Ungültige Firebase-Antwort');
  return { idToken: data.idToken, refreshToken: data.refreshToken, uid: data.localId,
    expiresAt: Date.now() + Math.max(60, Number(data.expiresIn) || 3600) * 1000 };
}

export async function refreshSession(config, session) {
  if (session.expiresAt > Date.now() + 90000) return session;
  const body = new URLSearchParams({
    grant_type: 'refresh_token', refresh_token: session.refreshToken
  });
  const data = await jsonRequest(SECURE_TOKEN + '/token?key=' +
    encodeURIComponent(config.apiKey), {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!data.id_token || !data.refresh_token || data.user_id !== session.uid) {
    throw new Error('Firebase-Sitzung ungültig, bitte erneut anmelden');
  }
  return { idToken: data.id_token, refreshToken: data.refresh_token, uid: session.uid,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000 };
}

function documentName(config, uid) {
  if (!/^[a-z0-9-]+$/i.test(config.projectId) || !/^[a-zA-Z0-9]+$/.test(uid)) {
    throw new Error('Ungültiges Firebase-Projekt oder Benutzer');
  }
  return 'projects/' + config.projectId + '/databases/(default)/documents/vaults/' + uid;
}

function unpackEnvelope(data) {
  const fields = data?.fields?.envelope?.mapValue?.fields;
  if (!fields) throw new Error('Kein verschlüsselter Cloud-Tresor gefunden');
  const n = name => {
    const raw = fields[name];
    if (!raw) throw new Error('Cloud-Tresor beschädigt: ' + name);
    return name === 'v' || name === 'iterations' || name === 'updatedAt'
      ? Number(raw.integerValue ?? raw.doubleValue) : raw.stringValue;
  };
  return {
    v: n('v'), iterations: n('iterations'), salt: n('salt'),
    nonce: n('nonce'), ciphertext: n('ciphertext'), updatedAt: n('updatedAt')
  };
}

export async function readCloudVault(config, session) {
  const name = documentName(config, session.uid);
  const data = await jsonRequest(FIRESTORE + '/' + name, {
    headers: { Authorization: 'Bearer ' + session.idToken }
  });
  if (typeof data.updateTime !== 'string') throw new Error('Cloud-Revision fehlt');
  return { envelope: unpackEnvelope(data), updateTime: data.updateTime };
}

export async function writeCloudVault(config, session, envelope, updateTime) {
  if (typeof updateTime !== 'string' || !updateTime.length) {
    throw new Error('Cloud-Konfliktschutz fehlt; Speichern verweigert');
  }
  const name = documentName(config, session.uid);
  const fields = {};
  for (const k of ['v', 'iterations', 'updatedAt']) {
    fields[k] = { integerValue: String(envelope[k]) };
  }
  for (const k of ['salt', 'nonce', 'ciphertext']) {
    fields[k] = { stringValue: envelope[k] };
  }
  const write = {
    update: { name, fields: { envelope: { mapValue: { fields } } } },
    updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: { updateTime }
  };
  try {
    return await jsonRequest(FIRESTORE + '/projects/' + config.projectId +
      '/databases/(default)/documents:commit', {
      method: 'POST', headers: {
        Authorization: 'Bearer ' + session.idToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ writes: [write] })
    });
  } catch (error) {
    if (error.httpStatus === 409 || error.httpStatus === 412 ||
        /ABORTED|FAILED_PRECONDITION/.test(error.message)) {
      throw new Error('CLOUD_CONFLICT: Der Cloud-Tresor wurde auf einem anderen Gerät geändert. Neu laden, Änderungen prüfen.');
    }
    throw error;
  }
}
