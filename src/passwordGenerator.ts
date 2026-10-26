// Cryptographically unbiased selection, unlike modulo on a Uint32Array.
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?-_';
export function generateStrongPassword(length = 24): string {
  if (!Number.isInteger(length) || length < 12 || length > 128) throw new Error('Ungültige Passwortlänge');
  const out: string[] = [];
  const limit = 256 - (256 % ALPHABET.length);
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(Math.max(32, length)));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      out.push(ALPHABET[byte % ALPHABET.length]);
      if (out.length === length) break;
    }
  }
  return out.join('');
}
