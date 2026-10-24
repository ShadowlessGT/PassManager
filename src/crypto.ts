import type { VaultData } from './types';

export const KDF_ITERATIONS = 600_000;
export type EncryptedEnvelope = {
  v: 1;
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
  updatedAt: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export function newSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveVaultKey(password: string, salt: string): Promise<CryptoKey> {
  if (!password) throw new Error('Master-Passwort erforderlich.');
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt) as BufferSource, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // Needed to wrap a key in Android/iOS secure storage after explicit device-auth enrollment.
    ['encrypt', 'decrypt']
  );
}

export async function encryptVault(data: VaultData, key: CryptoKey, salt: string): Promise<EncryptedEnvelope> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, key, encoded);
  return {
    v: 1,
    iterations: KDF_ITERATIONS,
    salt,
    nonce: toBase64(nonce),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    updatedAt: Date.now()
  };
}

export async function decryptVault(envelope: EncryptedEnvelope, key: CryptoKey): Promise<VaultData> {
  if (envelope.v !== 1 || envelope.iterations !== KDF_ITERATIONS || fromBase64(envelope.nonce).length !== 12 || fromBase64(envelope.salt).length !== 16) {
    throw new Error('Unbekanntes oder beschädigtes Tresorformat.');
  }
  const clear = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.nonce) as BufferSource },
    key,
    fromBase64(envelope.ciphertext) as BufferSource
  );
  const result: unknown = JSON.parse(decoder.decode(clear));
  if (!result || typeof result !== 'object' || !('version' in result) || result.version !== 1 ||
      !('entries' in result) || !Array.isArray(result.entries)) {
    throw new Error('Ungültiger Tresorinhalt.');
  }
  return result as VaultData;
}
