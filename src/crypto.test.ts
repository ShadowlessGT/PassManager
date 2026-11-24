import { describe, expect, it } from 'vitest';
import { decryptVault, deriveVaultKey, encryptVault, newSalt, toBase64, fromBase64 } from './crypto';
import { blankEntry, newVault } from './types';

describe('vault encryption', () => {
  it('preserves the standard base64 format across large vault chunk boundaries', () => {
    for (const length of [0, 1, 2, 3, 24575, 24576, 24577, 49154, 1048579]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 17 + 251) & 255);
      const expected = Buffer.from(bytes).toString('base64');
      expect(toBase64(bytes)).toBe(expected);
      expect(fromBase64(expected)).toEqual(bytes);
    }
  });

  it('round-trips the entire entry and uses randomized nonces', async () => {
    const salt = newSalt();
    const key = await deriveVaultKey('a very long and unique test master password', salt);
    const record = blankEntry();
    record.title = 'Banking';
    record.password = 'top_secret_sample_password';
    record.notes = 'private comment';
    record.categories = ['Privat', 'Finanzen'];
    record.person = 'Familie';
    const vault = newVault();
    vault.entries.push(record);
    const encrypted1 = await encryptVault(vault, key, salt);
    const encrypted2 = await encryptVault(vault, key, salt);
    expect(encrypted1.ciphertext).not.toContain(record.password);
    expect(encrypted1.ciphertext).not.toContain(record.title);
    expect(encrypted1.nonce).not.toBe(encrypted2.nonce);
    expect(await decryptVault(encrypted1, key)).toEqual(vault);
  });

  it('rejects a wrong key or modified ciphertext', async () => {
    const salt = newSalt();
    const good = await deriveVaultKey('correct long password', salt);
    const wrong = await deriveVaultKey('incorrect long password', salt);
    const encrypted = await encryptVault(newVault(), good, salt);
    await expect(decryptVault(encrypted, wrong)).rejects.toThrow();
    const bad = { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -4) + 'AAAA' };
    await expect(decryptVault(bad, good)).rejects.toThrow();
  });
});
