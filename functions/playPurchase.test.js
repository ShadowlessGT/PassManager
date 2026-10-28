'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { HttpsError } = require('firebase-functions/v2/https');
const { hash, PRODUCT, validatePurchase, verifyPlayPurchase, refreshPlayEntitlement } = require('./playPurchase');
const uid = 'test-user';
const token = 'purchase-token-valid-123456789';
const response = (state = 'PURCHASED', account = hash(uid)) => ({
  productLineItem: [{ productId: PRODUCT }],
  purchaseStateContext: { purchaseState: state },
  acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
  obfuscatedExternalAccountId: account
});
class MockDb {
  constructor() { this.records = new Map(); }
  doc(path) { return { path, get: async () => this.snapshot(path) }; }
  snapshot(path) {
    const value = this.records.get(path);
    return { exists: value !== undefined, data: () => value };
  }
  runTransaction(task) {
    const tx = {
      get: async ref => this.snapshot(ref.path),
      set: (ref, value) => this.records.set(ref.path, value),
      delete: ref => this.records.delete(ref.path)
    };
    return task(tx);
  }
}
test('reject pending purchase without granting Ultra', async () => {
  const db = new MockDb();
  let acknowledgements = 0;
  await assert.rejects(
    verifyPlayPurchase(uid, token, db, {
      readPlayPurchase: async () => response('PENDING'),
      acknowledge: async () => { acknowledgements++; }
    }), /ausstehend/);
  assert.equal(acknowledgements, 0);
  assert.equal(db.records.size, 0);
});
test('reject changed product and account mismatch', async () => {
  assert.throws(() => validatePurchase({ ...response(), productLineItem: [{ productId: 'other' }] }, uid));
  assert.throws(() => validatePurchase(response('PURCHASED', hash('attacker')), uid), /anderen/);
});
test('verified purchased token grants lifetime, acknowledges and is idempotent', async () => {
  const db = new MockDb();
  let calls = 0;
  const api = { readPlayPurchase: async () => response(), acknowledge: async () => { calls++; } };
  assert.deepEqual(await verifyPlayPurchase(uid, token, db, api), {
    active: true, lifetime: true, productId: PRODUCT
  });
  assert.equal(calls, 1);
  assert.equal(db.snapshot('accessEntitlements/' + uid).data().source, 'google_play');
  assert.equal(db.snapshot('playTokensByUser/' + uid).data().purchaseToken, token);
  await verifyPlayPurchase(uid, token, db, api);
  assert.equal(db.records.size, 3);
});
test('previously claimed token cannot be given to another account', async () => {
  const db = new MockDb();
  db.records.set('playPurchases/' + hash(token), { uid: 'different-user' });
  await assert.rejects(verifyPlayPurchase(uid, token, db, {
    readPlayPurchase: async () => response(), acknowledge: async () => {}
  }), /anderen Konto/);
});
test('existing lifetime gift is never downgraded by Play verification', async () => {
  const db = new MockDb();
  db.records.set('accessEntitlements/' + uid, { tier: 'pro', source: 'admin_gift', expiresAt: null });
  await verifyPlayPurchase(uid, token, db, {
    readPlayPurchase: async () => response(), acknowledge: async () => {}
  });
  assert.equal(db.snapshot('accessEntitlements/' + uid).data().source, 'admin_gift');
});
test('refund removes only a Google Play entitlement, not a gift', async () => {
  const db = new MockDb();
  db.records.set('playTokensByUser/' + uid, { purchaseToken: token });
  db.records.set('accessEntitlements/' + uid, {
    tier: 'pro', source: 'google_play', tokenHash: hash(token)
  });
  assert.deepEqual(await refreshPlayEntitlement(uid, db, {
    readPlayPurchase: async () => response('CANCELLED')
  }), { active: false, linked: true });
  assert.equal(db.snapshot('accessEntitlements/' + uid).exists, false);
  db.records.set('accessEntitlements/' + uid, { tier: 'pro', source: 'admin_gift', expiresAt: null });
  await refreshPlayEntitlement(uid, db, {
    readPlayPurchase: async () => response('CANCELLED')
  });
  assert.equal(db.snapshot('accessEntitlements/' + uid).exists, true);
});
