import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  KDF_ITERATIONS, unlockKey, encryptVault, decryptVault,
  matchesWebsite, credentialsForPage, makeLoginEntry, validateEnvelope
} from '../shared/vault.mjs';
import { writeCloudVault, readCloudVault } from '../shared/firebase-rest.mjs';

describe('Parola WebExtension zero-knowledge compatibility', () => {
  it('matches current Android schema and round trips AES-256-GCM PBKDF2', async () => {
    assert.equal(KDF_ITERATIONS, 600_000);
    const salt = randomBytes(16).toString('base64');
    const initial = {
      v: 1, iterations: KDF_ITERATIONS, salt,
      nonce: randomBytes(12).toString('base64'),
      ciphertext: Buffer.alloc(32).toString('base64'), updatedAt: Date.now()
    };
    const key = await unlockKey('Only-For-Local-Test-2026', initial);
    const data = { version: 1, entries: [makeLoginEntry({
      siteUrl: 'https://example.test', username: 'test-person',
      password: 'DUMMY-SECRET-NO-REAL-PASSWORD'
    })] };
    const envelope = await encryptVault(data, key, salt);
    assert.deepEqual(await decryptVault(envelope, key), data);
    assert.equal(envelope.salt, salt);
    assert.equal(envelope.iterations, KDF_ITERATIONS);
    assert.equal(envelope.v, 1);
    assert.ok(!JSON.stringify(envelope).includes('DUMMY-SECRET'));
    const wrong = await unlockKey('Incorrect', envelope);
    await assert.rejects(decryptVault(envelope, wrong));
  });
  it('rejects invalid encrypted envelope without guessing its format', () => {
    assert.throws(() => validateEnvelope({ v: 5, iterations: 2, salt: 'oops' }));
  });
  it('never fills lookalike domains and never matches HTTP or subdomains', () => {
    assert.equal(matchesWebsite('https://bank.example/login', 'https://bank.example/page'), true);
    assert.equal(matchesWebsite('https://bank.example', 'https://bank.example.evil.test'), false);
    assert.equal(matchesWebsite('https://bank.example', 'https://evil.bank.example'), false);
    assert.equal(matchesWebsite('https://bank.example', 'http://bank.example'), false);
    assert.equal(matchesWebsite('https://bank.example', 'https://bank.example:444'), false);
    assert.equal(credentialsForPage([makeLoginEntry({
      siteUrl: 'https://bank.example', username: 'u', password: 'x'
    })], 'https://bank.example.evil.test').length, 0);
  });
  it('rejects plaintext credentials for non-HTTPS pages', () => {
    assert.throws(() => makeLoginEntry({
      siteUrl: 'http://example.test', username: 'user', password: 'dummy'
    }));
  });
  it('sends only ciphertext and a revision precondition to Firestore', async () => {
    const previousFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      return { ok: true, text: async () => '{}' };
    };
    try {
      const config = { projectId: 'password-manager-parola', apiKey: 'local-test-public-key' };
      const session = { uid: 'testUid7', idToken: 'not-a-real-token' };
      const envelope = {
        v: 1, iterations: KDF_ITERATIONS, salt: randomBytes(16).toString('base64'),
        nonce: randomBytes(12).toString('base64'),
        ciphertext: randomBytes(60).toString('base64'), updatedAt: Date.now()
      };
      await writeCloudVault(config, session, envelope, '2026-11-11T12:00:00.000Z');
      assert.equal(calls.length, 1);
      assert.match(calls[0].url, /firestore\.googleapis\.com\/v1\/projects\/password-manager-parola/);
      const payload = JSON.parse(calls[0].options.body);
      assert.deepEqual(payload.writes[0].currentDocument, {
        updateTime: '2026-11-11T12:00:00.000Z'
      });
      assert.equal(payload.writes[0].updateTransforms[0].setToServerValue, 'REQUEST_TIME');
      assert.deepEqual(Object.keys(payload.writes[0].update.fields), ['envelope']);
      assert.equal(payload.writes[0].update.fields.envelope.mapValue.fields.ciphertext.stringValue, envelope.ciphertext);
      await assert.rejects(writeCloudVault(config, session, envelope, null));
    } finally { globalThis.fetch = previousFetch; }
  });
  it('parses Android Firestore envelope without touching its ciphertext', async () => {
    const previousFetch = globalThis.fetch;
    const envelope = {
      v: 1, iterations: KDF_ITERATIONS, salt: randomBytes(16).toString('base64'),
      nonce: randomBytes(12).toString('base64'), ciphertext: randomBytes(60).toString('base64'),
      updatedAt: Date.now()
    };
    const fields = Object.fromEntries(Object.entries(envelope).map(([k, v]) =>
      [k, typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v }]));
    globalThis.fetch = async () => ({
      ok: true,
      text: async () => JSON.stringify({
        updateTime: '2026-11-11T12:00:00Z',
        fields: { envelope: { mapValue: { fields } } }
      })
    });
    try {
      const result = await readCloudVault({ projectId: 'password-manager-parola' },
        { uid: 'testUid7', idToken: 'fake' });
      assert.deepEqual(result.envelope, envelope);
      assert.equal(result.updateTime, '2026-11-11T12:00:00Z');
    } finally { globalThis.fetch = previousFetch; }
  });
});


describe('Independent PBKDF2/AES-GCM compatibility fixture', () => {
  it('decrypts a known Python/OpenSSL-compatible fixture with Android envelope v1', async () => {
    // Derived independently using hashlib.pbkdf2_hmac('sha256', ..., 600000, 32)
    // and AESGCM.encrypt(nonce, b'{"version":1,"entries":[]}', None).
    const fixture = {
      v: 1, iterations: 600000,
      salt: 'AAECAwQFBgcICQoLDA0ODw==',
      nonce: 'EBESExQVFhcYGRob',
      ciphertext: 'RJa55B5EIzONLbbCusjBLAQMIA75tijSeHXAvQOTGjbTACAB2f2MdECE',
      updatedAt: 1
    };
    const key = await unlockKey('Parola-Interop-Dummy-2026!', fixture);
    assert.deepEqual(await decryptVault(fixture, key), { version: 1, entries: [] });
    const incorrect = await unlockKey('Wrong-Password', fixture);
    await assert.rejects(decryptVault(fixture, incorrect));
  });
});
