import type { EncryptedEnvelope } from './crypto';

const DB_NAME = 'passmanager-vault-v1';
const STORE = 'encrypted';
const KEY = 'current';

function connect(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await connect();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = callback(tx.objectStore(STORE));
      let value: T;
      request.onsuccess = () => { value = request.result; };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function readLocalVault(): Promise<EncryptedEnvelope | null> {
  return (await transaction('readonly', store => store.get(KEY))) ?? null;
}

export async function writeLocalVault(envelope: EncryptedEnvelope): Promise<void> {
  await transaction('readwrite', store => store.put(envelope, KEY));
}

const PRE_RESTORE_KEY = 'previous-before-cloud-restore';

/** A recovery copy is always encrypted and stays only on this device. */
export async function readPreviousLocalVault(): Promise<EncryptedEnvelope | null> {
  return (await transaction('readonly', store => store.get(PRE_RESTORE_KEY))) ?? null;
}

/** Atomically save the old vault before replacing it. */
async function swapEncryptedVault(candidate: EncryptedEnvelope): Promise<void> {
  const db = await connect();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const existing = store.get(KEY);
      existing.onsuccess = () => {
        if (existing.result) store.put(existing.result, PRE_RESTORE_KEY);
        store.put(candidate, KEY);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Tresor konnte nicht gespeichert werden.'));
      tx.onabort = () => reject(tx.error ?? new Error('Tresorwechsel abgebrochen.'));
    });
  } finally {
    db.close();
  }
}

export async function replaceVaultWithVerifiedCloudCopy(candidate: EncryptedEnvelope): Promise<void> {
  // Must be called only AFTER successfully decrypting and validating the candidate.
  await swapEncryptedVault(candidate);
}

export async function restorePreviousLocalVault(): Promise<boolean> {
  const previous = await readPreviousLocalVault();
  if (!previous) return false;
  await swapEncryptedVault(previous);
  return true;
}
