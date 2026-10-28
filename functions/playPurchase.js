'use strict';
const { createHash } = require('node:crypto');
const { GoogleAuth } = require('google-auth-library');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');

const PACKAGE = 'com.shadowlessstudios.passwordmanager';
const PRODUCT = 'parola_ultra_lifetime';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const oauth = new GoogleAuth({ scopes: [SCOPE] });
const hash = value => createHash('sha256').update(value).digest('hex');

async function playRequest(url, method = 'GET') {
  const accessToken = await oauth.getAccessToken();
  if (!accessToken) throw new Error('Android Publisher API credentials unavailable');
  const response = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json',
               ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method !== 'GET' ? { body: '{}' } : {}),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    // Do not print the purchase token, user ID or URL into logs.
    const error = new Error('Google Play Publisher API status ' + response.status);
    error.status = response.status;
    throw error;
  }
  if (method !== 'GET') return {};
  return response.json();
}

async function readPlayPurchase(token) {
  const address = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' +
    PACKAGE + '/purchases/productsv2/tokens/' + encodeURIComponent(token);
  return playRequest(address);
}
async function acknowledge(token) {
  const address = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' +
    PACKAGE + '/purchases/products/' + PRODUCT + '/tokens/' +
    encodeURIComponent(token) + ':acknowledge';
  return playRequest(address, 'POST');
}
function validatePurchase(purchase, uid) {
  if (!purchase || !purchase.productLineItem?.some(item => item.productId === PRODUCT)) {
    throw new HttpsError('failed-precondition', 'Falsches Google Play Produkt.');
  }
  const state = purchase.purchaseStateContext?.purchaseState;
  if (state === 'PENDING') throw new HttpsError('failed-precondition', 'Zahlung noch ausstehend.');
  if (state !== 'PURCHASED') throw new HttpsError('failed-precondition', 'Kauf nicht aktiv.');
  if (purchase.obfuscatedExternalAccountId &&
      purchase.obfuscatedExternalAccountId !== hash(uid)) {
    throw new HttpsError('permission-denied', 'Kauf gehört einem anderen Firebase-Konto.');
  }
  return true;
}

async function verifyPlayPurchase(uid, token, db = getFirestore(), api = { readPlayPurchase, acknowledge }) {
  if (!uid || typeof token !== 'string' || token.length < 8 || token.length > 8192) {
    throw new HttpsError('invalid-argument', 'Ungültige Kaufdaten.');
  }
  const purchase = await api.readPlayPurchase(token);
  validatePurchase(purchase, uid);
  if (purchase.acknowledgementState !== 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED') {
    await api.acknowledge(token);
  }
  const digest = hash(token);
  const tokenRef = db.doc('playPurchases/' + digest);
  const userTokenRef = db.doc('playTokensByUser/' + uid);
  const entitlementRef = db.doc('accessEntitlements/' + uid);
  await db.runTransaction(async tx => {
    const [claimed, current] = await Promise.all([tx.get(tokenRef), tx.get(entitlementRef)]);
    if (claimed.exists && claimed.data().uid !== uid) {
      throw new HttpsError('already-exists', 'Dieser Kauf wurde bereits einem anderen Konto zugeordnet.');
    }
    tx.set(tokenRef, {
      uid, productId: PRODUCT, tokenHash: digest,
      updatedAt: FieldValue.serverTimestamp()
    });
    tx.set(userTokenRef, { purchaseToken: token, tokenHash: digest,
      updatedAt: FieldValue.serverTimestamp() });
    const old = current.exists ? current.data() : null;
    // Never overwrite an existing lifetime gift with a Google Play source.
    if (!(old?.tier === 'pro' && old?.source === 'admin_gift' && old?.expiresAt === null)) {
      tx.set(entitlementRef, {
        tier: 'pro', source: 'google_play', expiresAt: null,
        tokenHash: digest, grantedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  });
  return { active: true, lifetime: true, productId: PRODUCT };
}
async function refreshPlayEntitlement(uid, db = getFirestore(), api = { readPlayPurchase }) {
  const userToken = await db.doc('playTokensByUser/' + uid).get();
  if (!userToken.exists || !userToken.data()?.purchaseToken) {
    return { active: false, linked: false };
  }
  const token = userToken.data().purchaseToken;
  const entitlementRef = db.doc('accessEntitlements/' + uid);
  const purchase = await api.readPlayPurchase(token);
  let active = false;
  try { validatePurchase(purchase, uid); active = true; }
  catch (error) {
    if (!(error instanceof HttpsError)) throw error;
  }
  if (!active) {
    await db.runTransaction(async tx => {
      const existing = await tx.get(entitlementRef);
      if (existing.exists && existing.data().source === 'google_play' &&
          existing.data().tokenHash === hash(token)) {
        tx.delete(entitlementRef);
      }
    });
  }
  return { active, linked: true };
}
module.exports = { PACKAGE, PRODUCT, hash, validatePurchase, verifyPlayPurchase,
  refreshPlayEntitlement, readPlayPurchase, acknowledge };
