// Shared cryptographic handoff for a Firebase-hosted Google sign-in.
// No Firebase token ever appears in a redirect URL as plaintext.
// ECDH P-256 + HKDF-SHA256 + AES-256-GCM; short-lived single-use handoff.
// This is a development candidate: a real browser Google login still needs QA.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DOMAIN = 'parola-extension-google-login-v1';
export const LOGIN_PAGE = 'https://parola.shadowless-studios.eu/extension-login.html';
export function b64url(bytes) {
  let raw = '';
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
export function unb64url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 24000) {
    throw new Error('Ungültige Login-Übertragung');
  }
  const v = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(v.padEnd(Math.ceil(v.length/4)*4,'='));
  return Uint8Array.from(raw, x => x.charCodeAt(0));
}
export const toJSON64 = obj => b64url(encoder.encode(JSON.stringify(obj)));
export const fromJSON64 = value => JSON.parse(decoder.decode(unb64url(value)));
export function validRedirect(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
        url.search || url.hash) return false;
    return (/^(?:[a-p]{32})\.chromiumapp\.org$/.test(url.hostname) && url.pathname === '/parola') ||
      /^[a-z0-9-]+\.extensions\.allizom\.org$/.test(url.hostname) &&
      (url.pathname === '/' || url.pathname === '/parola');
  } catch { return false; }
}
export function validState(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}
export function validPublicJwk(jwk) {
  return !!jwk && jwk.kty === 'EC' && jwk.crv === 'P-256' &&
    typeof jwk.x === 'string' && typeof jwk.y === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(jwk.x) && /^[A-Za-z0-9_-]{43}$/.test(jwk.y) &&
    !jwk.d;
}
export async function newChallenge(redirect) {
  if (!validRedirect(redirect)) throw new Error('Unsichere Browser-Rückleitungsadresse');
  const state = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const keys = await crypto.subtle.generateKey({ name:'ECDH', namedCurve:'P-256' }, true, ['deriveBits']);
  const publicJwk = await crypto.subtle.exportKey('jwk',keys.publicKey);
  const url = new URL(LOGIN_PAGE);
  url.searchParams.set('state', state);
  url.searchParams.set('redirect',redirect);
  url.searchParams.set('key',toJSON64({kty:'EC',crv:'P-256',x:publicJwk.x,y:publicJwk.y}));
  return { url: url.href, state, privateKey: keys.privateKey, redirect };
}
async function makeAes(privateKey, publicJwk, salt, state, redirect) {
  if (!validPublicJwk(publicJwk) || !validState(state) || !validRedirect(redirect) ||
      salt.length !== 16) throw new Error('Ungültiger verschlüsselter Login');
  const remote = await crypto.subtle.importKey('jwk', publicJwk,
    { name:'ECDH', namedCurve:'P-256' }, false, []);
  const bits = await crypto.subtle.deriveBits({name:'ECDH',public:remote},privateKey,256);
  const hkdf = await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt,
    info:encoder.encode(DOMAIN+'|'+state+'|'+redirect)},
    hkdf,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function verifySession(value) {
  if (!value || value.provider !== 'google.com' || typeof value.idToken !== 'string' ||
      typeof value.refreshToken !== 'string' || typeof value.uid !== 'string' ||
      !value.idToken || !value.refreshToken || !/^[a-zA-Z0-9]{3,128}$/.test(value.uid) ||
      !Number.isFinite(value.expiresAt) || value.expiresAt < Date.now() + 20000 ||
      value.expiresAt > Date.now() + 3_900_000) throw new Error('Ungültige Google-Firebase-Sitzung');
  return value;
}
export async function sealSession(session, { state, redirect, key }) {
  const verified = verifySession(session);
  const publicJwk = fromJSON64(key);
  if (!validPublicJwk(publicJwk)) throw new Error('Ungültiger Erweiterungsschlüssel');
  const keys = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aes = await makeAes(keys.privateKey,publicJwk,salt,state,redirect);
  const aad = encoder.encode(DOMAIN+'|'+state+'|'+redirect);
  const cipher = await crypto.subtle.encrypt(
    {name:'AES-GCM',iv,additionalData:aad},aes,encoder.encode(JSON.stringify(verified)));
  const ownPublic = await crypto.subtle.exportKey('jwk',keys.publicKey);
  const bundle = toJSON64({v:1,publicKey:{
    kty:'EC',crv:'P-256',x:ownPublic.x,y:ownPublic.y
  },salt:b64url(salt),iv:b64url(iv),cipher:b64url(new Uint8Array(cipher))});
  if (bundle.length > 12000) throw new Error('Verschlüsselter Login ist zu groß');
  return redirect+'#state='+state+'&bundle='+encodeURIComponent(bundle);
}
export async function openSession(responseUrl, {state,privateKey,redirect}) {
  if (!validState(state) || !validRedirect(redirect) ||
      typeof responseUrl !== 'string' || !responseUrl.startsWith(redirect+'#') ||
      responseUrl.length > 16000) throw new Error('Unbekannte Login-Rückleitung');
  const url = new URL(responseUrl);
  if (url.origin+url.pathname !== redirect || url.search) throw new Error('Geänderte Login-Zieladresse');
  const params = new URLSearchParams(url.hash.slice(1));
  if (params.get('state') !== state || params.getAll('bundle').length !== 1)
    throw new Error('Login-Zustand stimmt nicht überein');
  const packet = fromJSON64(params.get('bundle'));
  if (packet.v !== 1) throw new Error('Falsches Login-Protokoll');
  const iv = unb64url(packet.iv),salt=unb64url(packet.salt),cipher=unb64url(packet.cipher);
  if (iv.length !== 12 || salt.length !== 16 || cipher.length < 32 || cipher.length > 8000)
    throw new Error('Beschädigte verschlüsselte Sitzung');
  const aes = await makeAes(privateKey,packet.publicKey,salt,state,redirect);
  const plaintext = await crypto.subtle.decrypt({
    name:'AES-GCM',iv,additionalData:encoder.encode(DOMAIN+'|'+state+'|'+redirect)
  },aes,cipher);
  return verifySession(JSON.parse(decoder.decode(plaintext)));
}
