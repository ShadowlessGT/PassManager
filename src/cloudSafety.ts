import { decryptVault, deriveVaultKey } from './crypto';
import type { EncryptedEnvelope } from './crypto';

export async function verifyCloudVault(envelope: EncryptedEnvelope, password: string) {
  if (!password) throw new Error('Bitte das Passwort der Cloud-Sicherung eingeben.');
  if (!envelope || envelope.v !== 1 || envelope.iterations !== 600_000 || !envelope.salt || !envelope.nonce || !envelope.ciphertext) {
    throw new Error('Ungültige Cloud-Sicherungsdatei.');
  }
  try {
    return await decryptVault(envelope, await deriveVaultKey(password, envelope.salt));
  } catch {
    throw new Error('Das Sicherungspasswort stimmt nicht oder die Sicherung ist beschädigt. Dein lokaler Tresor bleibt erhalten.');
  }
}
export function vaultRevision(envelope: EncryptedEnvelope | null): string | null {
  return envelope ? envelope.nonce + ':' + envelope.updatedAt : null;
}
