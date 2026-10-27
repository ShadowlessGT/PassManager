'use strict';

const { createHmac, randomBytes } = require('node:crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const store = getFirestore();
const hmacKey = defineSecret('PASSMANAGER_REDEMPTION_HMAC_KEY');
const options = { region: 'europe-west3', enforceAppCheck: true, secrets: [hmacKey] };

function normalizeCode(code) {
  if (typeof code !== 'string') return '';
  return code.replace(/[\s-]/g, '').toUpperCase();
}

function codeHash(code) {
  // Codes never appear in Firestore plaintext; this secret is server-side only.
  return createHmac('sha256', hmacKey.value()).update(normalizeCode(code)).digest('hex');
}
const requireUser = request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Bitte anmelden.');
  return request.auth.uid;
};
const requireAdmin = request => {
  requireUser(request);
  if (request.auth.token.passmanagerAdmin !== true)
    throw new HttpsError('permission-denied', 'Administratorberechtigung erforderlich.');
};

exports.adminCreateGiftCodes = onCall(options, async request => {
  requireAdmin(request);
  const count = Number(request.data?.count);
  const days = Number(request.data?.days);
  if (!Number.isInteger(count) || count < 1 || count > 25)
    throw new HttpsError('invalid-argument', 'Erlaubt sind 1–25 Codes pro Aufruf.');
  // Zero days means non-expiring lifetime. 1–365 days grants time-bound access.
  if (!Number.isInteger(days) || days < 0 || days > 365)
    throw new HttpsError('invalid-argument', 'Gültigkeitsdauer 0–365 Tage.');
  const now = Date.now();
  const codes = [];
  const batch = store.batch();
  for (let i = 0; i < count; i++) {
    const code = 'PM-' + randomBytes(16).toString('hex').toUpperCase();
    const id = codeHash(code);
    const ref = store.doc('redeemCodes/' + id);
    batch.create(ref, {
      kind: 'gift',
      createdAt: Timestamp.fromMillis(now),
      createdBy: request.auth.uid,
      expiresAt: Timestamp.fromMillis(now + 30 * 86400000),
      entitlementDays: days,
      redeemedBy: null,
      redeemedAt: null
    });
    codes.push(code);
  }
  await batch.commit();
  // Return secret codes only once to an authenticated admin. UI must not persist them.
  return { codes, redemptionWindowDays: 30, entitlementDays: days };
});

exports.redeemGiftCode = onCall(options, async request => {
  const uid = requireUser(request);
  const code = normalizeCode(request.data?.code);
  if (!/^PM[A-F0-9]{32}$/.test(code))
    throw new HttpsError('invalid-argument', 'Ungültiges Codeformat.');
  const now = Date.now();
  const codeRef = store.doc('redeemCodes/' + codeHash(code));
  const userRef = store.doc('accessEntitlements/' + uid);
  const limiterRef = store.doc('redemptionAttempts/' + uid);
  const result = await store.runTransaction(async tx => {
    const [limitDoc, codeDoc, existingDoc] = await tx.getAll(limiterRef, codeRef, userRef);
    const old = limitDoc.exists ? limitDoc.data() : null;
    const windowStart = old?.windowStart?.toMillis?.() ?? 0;
    const count = now - windowStart < 3600000 ? old.count ?? 0 : 0;
    if (count >= 10) return { status: 'rate-limited' };
    tx.set(limiterRef, {
      windowStart: Timestamp.fromMillis(count ? windowStart : now),
      count: count + 1,
      updatedAt: FieldValue.serverTimestamp()
    });
    if (!codeDoc.exists) return { status: 'invalid' };
    const offer = codeDoc.data();
    if (offer.kind !== 'gift' || offer.redeemedBy !== null || offer.expiresAt.toMillis() < now)
      return { status: 'invalid' };
    const existing = existingDoc.exists ? existingDoc.data() : null;
    if (existing?.tier === 'pro' && existing?.expiresAt === null)
      return { status: 'already-lifetime' };
    const expiryMs = offer.entitlementDays === 0 ? null : now + offer.entitlementDays * 86400000;
    // Never downgrade an existing valid entitlement.
    const existingExpiry = existing?.expiresAt?.toMillis?.() || 0;
    const expiry = existingExpiry > (expiryMs || 0) ? existing.expiresAt : expiryMs ? Timestamp.fromMillis(expiryMs) : null;
    tx.update(codeRef, { redeemedBy: uid, redeemedAt: FieldValue.serverTimestamp() });
    tx.set(userRef, {
      tier: 'pro',
      source: 'admin_gift',
      expiresAt: expiry,
      grantedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    return { status: 'ok', expiresAt: expiry ? expiry.toMillis() : null };
  });
  if (result.status === 'rate-limited') throw new HttpsError('resource-exhausted', 'Zu viele Versuche. Bitte später erneut probieren.');
  if (result.status === 'invalid') throw new HttpsError('not-found', 'Code ungültig, abgelaufen oder bereits verwendet.');
  if (result.status === 'already-lifetime') return { active: true, lifetime: true, alreadyOwned: true };
  return { active: true, lifetime: result.expiresAt === null, expiresAt: result.expiresAt };
});

// Google Play purchases must NOT be granted by this endpoint. Play Billing purchases
// require a separate verified Google Play Developer API token pipeline.


/**
 * Parola account deletion, callable only with a fresh Firebase sign-in and App Check.
 * A correct ID token never grants access to any other user's account.
 */
const { removeOwnAccount } = require('./accountDeletion');
// Deletion must also be accessible outside the Android app; recent reauthentication is mandatory.
exports.deleteOwnAccount = onCall({ region: 'europe-west3', enforceAppCheck: false }, async request => {
  const uid = requireUser(request);
  if (request.data?.confirm !== 'DELETE') {
    throw new HttpsError('invalid-argument', 'Bitte Kontolöschung ausdrücklich bestätigen.');
  }
  const authTime = Number(request.auth.token.auth_time || 0);
  const elapsed = Math.floor(Date.now() / 1000) - authTime;
  if (!authTime || elapsed < 0 || elapsed > 300) {
    throw new HttpsError('failed-precondition', 'Bitte erneut anmelden und Kontolöschung wiederholen.');
  }
  try { return await removeOwnAccount(uid); }
  catch (error) {
    console.error('Account removal failed', error?.name || 'unknown');
    throw new HttpsError('internal', 'Kontolöschung fehlgeschlagen. Bitte erneut versuchen.');
  }
});
