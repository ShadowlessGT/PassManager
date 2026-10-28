'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { removeOwnAccount } = require('./accountDeletion');

function mock() {
  const actions = [];
  const db = {
    doc: path => ({
      get: async () => ({ exists: false }),
      delete: async () => { actions.push('delete:' + path); }
    }),
    collection: collection => ({
      where: field => ({
        get: async () => ({ docs: [
          { ref: { update: async () => actions.push('update:' + field),
                   delete: async () => actions.push('remove-spent:' + field) } }
        ] })
      })
    })
  };
  const auth = { deleteUser: async uid => actions.push('auth:' + uid) };
  return { actions, db, auth };
}
test('delete current account removes vault, licence and spent codes before authentication', async () => {
  const { actions, db, auth } = mock();
  assert.deepEqual(await removeOwnAccount('tester', db, auth), { deleted: true });
  assert.deepEqual(actions, [
    'delete:vaults/tester', 'delete:accessEntitlements/tester',
    'delete:redemptionAttempts/tester', 'delete:playTokensByUser/tester', 'update:createdBy',
    'remove-spent:redeemedBy', 'auth:tester'
  ]);
});
test('missing identity cannot trigger deletion', async () => {
  const { db, auth, actions } = mock();
  await assert.rejects(removeOwnAccount('', db, auth), /Missing authenticated/);
  assert.deepEqual(actions, []);
});
test('failed data cleanup must not delete login identity', async () => {
  let authDeleted = false;
  const db = { doc: () => ({ delete: async () => { throw new Error('Firestore offline'); } }) };
  await assert.rejects(removeOwnAccount('tester', db, { deleteUser: async () => { authDeleted = true; } }), /Firestore offline/);
  assert.equal(authDeleted, false);
});