const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
async function removeOwnAccount(uid) {
  if (!uid) throw new Error('Missing user identity');
  const db = getFirestore();
  await db.doc(`vaults/${uid}`).delete();
  await db.doc(`accessEntitlements/${uid}`).delete();
  await db.doc(`redemptionAttempts/${uid}`).delete();
  await getAuth().deleteUser(uid);
}
module.exports = { removeOwnAccount };
