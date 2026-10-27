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
  const created = await db.collection('redeemCodes').where('createdBy', '==', uid).get();
  for (const record of created.docs) await record.ref.update({ createdBy: null });
  const redeemed = await db.collection('redeemCodes').where('redeemedBy', '==', uid).get();
  for (const record of redeemed.docs) await record.ref.delete();
  await auth.deleteUser(uid);
  return { deleted: true };
}
module.exports = { removeOwnAccount };
