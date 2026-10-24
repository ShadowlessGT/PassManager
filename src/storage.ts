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
