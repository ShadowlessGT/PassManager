import { describe, expect, it } from 'vitest';
import { newVault } from './types';
import { deriveVaultKey, encryptVault, newSalt } from './crypto';
import { verifyCloudVault, vaultRevision } from './cloudSafety';

describe('cloud recovery is authenticated before any local replacement', () => {
  it('decrypts a genuine encrypted remote vault using its own salt', async () => {
    const salt = newSalt();
    const password = 'correct restore passphrase 2026!';
    const key = await deriveVaultKey(password, salt);
    const envelope = await encryptVault(newVault(), key, salt);
    expect(await verifyCloudVault(envelope, password)).toEqual(newVault());
    expect(vaultRevision(envelope)).toContain(envelope.nonce);
    expect(vaultRevision(null)).toBeNull();
  });
  it('rejects wrong master passwords and corrupted ciphertext', async () => {
    const salt = newSalt();
    const key = await deriveVaultKey('correct secure long passphrase', salt);
    const original = await encryptVault(newVault(), key, salt);
    await expect(verifyCloudVault(original, 'wrong')).rejects.toThrow('lokaler Tresor');
    await expect(verifyCloudVault({ ...original, ciphertext: 'AAAA' }, 'correct secure long passphrase')).rejects.toThrow('lokaler Tresor');
  });
  it('rejects malformed envelopes and empty passwords', async () => {
    await expect(verifyCloudVault({} as never, 'pass')).rejects.toThrow('Ungültige');
    await expect(verifyCloudVault({} as never, '')).rejects.toThrow('Passwort');
  });
});
