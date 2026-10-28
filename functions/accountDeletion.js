'use strict';
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

/**
 * Purge Firebase data owned by one authenticated account, then the Auth account.
 * Auth is removed last so a failed operation can be retried after sign-in.
 * Redeemed codes are deleted rather than reset: spent codes must NEVER become reusable.
 */
async function removeOwnAccount(uid, db = getFirestore(), auth = getAuth()) {
  if (!uid || typeof uid !== 'string') throw new Error('Missing authenticated user identity');
  await db.doc('vaults/' + uid).delete();
  await db.doc('accessEntitlements/' + uid).delete();
  await db.doc('redemptionAttempts/' + uid).delete();
  // Remove the authenticated account's own purchase binding. The actual
  // Google Play purchase remains owned by its Google account and can be
  // restored to a new Firebase account after verified checkout.
  const tokenRef = db.doc('playTokensByUser/' + uid);
  const saved = await tokenRef.get();
  if (saved.exists && saved.data()?.tokenHash) {
    const claimRef = db.doc('playPurchases/' + saved.data().tokenHash);
    const claim = await claimRef.get();
    if (claim.exists && claim.data()?.uid === uid) await claimRef.delete();
  }
  await tokenRef.delete();
  const created = await db.collection('redeemCodes').where('createdBy', '==', uid).get();
  for (const record of created.docs) await record.ref.update({ createdBy: null });
  const redeemed = await db.collection('redeemCodes').where('redeemedBy', '==', uid).get();
  for (const record of redeemed.docs) await record.ref.delete();
  await auth.deleteUser(uid);
  return { deleted: true };
}
module.exports = { removeOwnAccount };
