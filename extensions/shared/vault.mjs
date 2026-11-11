/*
 * Parola's existing Android/Windows vault format. Never changes schema version.
 * No master password, CryptoKey or plaintext entry is persisted by this module.
 */
export const KDF_ITERATIONS = 600_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const to64 = bytes => btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
const from64 = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Ungültige Tresordaten');
  }
  return Uint8Array.from(atob(value), ch => ch.charCodeAt(0));
};

export function validateEnvelope(envelope) {
  if (!envelope || envelope.v !== 1 || envelope.iterations !== KDF_ITERATIONS ||
      typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length < 20 ||
      from64(envelope.salt).length !== 16 || from64(envelope.nonce).length !== 12 ||
      !Number.isFinite(envelope.updatedAt)) {
    throw new Error('Unbekanntes oder beschädigtes Parola-Tresorformat');
  }
  return envelope;
}

export async function unlockKey(masterPassword, envelope) {
  validateEnvelope(envelope);
  if (typeof masterPassword !== 'string' || !masterPassword.length) {
    throw new Error('Master-Passwort erforderlich');
  }
  const source = await crypto.subtle.importKey('raw', encoder.encode(masterPassword),
    { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey({
    name: 'PBKDF2', hash: 'SHA-256',
    iterations: KDF_ITERATIONS, salt: from64(envelope.salt)
  }, source, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function decryptVault(envelope, key) {
  validateEnvelope(envelope);
  const bytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: from64(envelope.nonce) }, key, from64(envelope.ciphertext)
  );
  const data = JSON.parse(decoder.decode(bytes));
  if (!data || data.version !== 1 || !Array.isArray(data.entries)) {
    throw new Error('Ungültiger Tresorinhalt');
  }
  return data;
}

export async function encryptVault(data, key, salt) {
  if (!data || data.version !== 1 || !Array.isArray(data.entries) ||
      from64(salt).length !== 16) throw new Error('Ungültiger Tresor');
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const bytes = encoder.encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, bytes);
  return {
    v: 1, iterations: KDF_ITERATIONS, salt,
    nonce: to64(nonce), ciphertext: to64(new Uint8Array(encrypted)),
    updatedAt: Date.now()
  };
}

// Use exact host matching. Do not send bank.example credentials to evil.bank.example.
export function matchesWebsite(website, pageUrl) {
  try {
    const site = new URL(website.includes('://') ? website : 'https://' + website);
    const page = new URL(pageUrl);
    return site.protocol === 'https:' && page.protocol === 'https:' &&
      site.hostname.toLowerCase() === page.hostname.toLowerCase() &&
      site.port === page.port;
  } catch { return false; }
}

export function credentialsForPage(entries, pageUrl) {
  return entries.filter(entry =>
    typeof entry.password === 'string' && entry.password.length > 0 &&
    matchesWebsite(String(entry.website || ''), pageUrl)
  );
}

export function makeLoginEntry({ siteUrl, username, password }) {
  if (!siteUrl || !username || !password || password.length > 8192 || username.length > 512) {
    throw new Error('Die erkannten Zugangsdaten sind ungültig oder zu lang');
  }
  const site = new URL(siteUrl);
  if (site.protocol !== 'https:') throw new Error('Nur HTTPS-Webseiten erlaubt');
  const now = Date.now();
  return {
    id: crypto.randomUUID(), title: site.hostname.slice(0, 120),
    username, email: username.includes('@') ? username : '',
    password, website: site.origin + '/', description: '', notes: '',
    categories: [], person: '', images: [], favorite: false,
    createdAt: now, updatedAt: now, passwordChangedAt: now, fields: []
  };
}
