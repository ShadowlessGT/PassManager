import type { EncryptedEnvelope } from './crypto';
import { snapshotDue, keepNewestSnapshots } from './snapshotPolicy';

const DB_NAME = 'passmanager-vault-v1';
const STORE = 'encrypted';
const KEY = 'current';
const SNAPSHOT_PREFIX = 'snapshot:';

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

/** Atomic master-password rotation: remove all older password-derived local
 * ciphertext copies. Never leave an old recovery copy accessible with old key.
 */
export async function replaceVaultAfterPasswordChange(envelope: EncryptedEnvelope): Promise<void> {
  const db = await connect();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.put(envelope, KEY);
      store.delete(PRE_RESTORE_KEY);
      const old = store.getAllKeys();
      old.onsuccess = () => old.result.forEach(key => {
        if (typeof key === 'string' && key.startsWith(SNAPSHOT_PREFIX)) store.delete(key);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Passwortwechsel konnte nicht gespeichert werden.'));
      tx.onabort = () => reject(tx.error ?? new Error('Passwortwechsel abgebrochen.'));
    });
  } finally { db.close(); }
}

/** Local-only emergency deletion. Cloud backups are never touched. This cannot
 * securely erase physical flash blocks or remote/device backups.
 */
export async function clearLocalVault(): Promise<void> {
  const db = await connect();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.delete(KEY);
      store.delete(PRE_RESTORE_KEY);
      const old = store.getAllKeys();
      old.onsuccess = () => old.result.forEach(key => {
        if (typeof key === 'string' && key.startsWith(SNAPSHOT_PREFIX)) store.delete(key);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Lokaler Tresor konnte nicht gelöscht werden.'));
      tx.onabort = () => reject(tx.error ?? new Error('Löschvorgang abgebrochen.'));
    });
  } finally { db.close(); }
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
        // A cloud restore may use a different master key/salt: old snapshot
        // ciphertext must not remain silently accessible with an obsolete key.
        const keys = store.getAllKeys();
        keys.onsuccess = () => keys.result.forEach(key => {
          if (typeof key === 'string' && key.startsWith(SNAPSHOT_PREFIX)) store.delete(key);
        });
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

export type LocalSnapshot = { id: string; createdAt: number };

/** Stores only previously AES-GCM encrypted envelopes in IndexedDB.
 * These are on-device recovery points, NOT uninstall/device-loss backups.
 */
export async function listLocalSnapshots(): Promise<LocalSnapshot[]> {
  const keys = await transaction('readonly', store => store.getAllKeys());
  return keys.filter((key): key is string => typeof key === 'string' &&
    /^snapshot:[0-9]{13}$/.test(key))
    .map(id => ({id,createdAt:Number(id.slice(SNAPSHOT_PREFIX.length))}))
    .sort((a,b)=>b.createdAt-a.createdAt);
}

export async function readLocalSnapshot(id: string): Promise<EncryptedEnvelope | null> {
  if (!/^snapshot:[0-9]{13}$/.test(id)) throw new Error('Ungültige Sicherungskennung.');
  return (await transaction('readonly',store=>store.get(id))) ?? null;
}

export async function saveLocalSnapshot(envelope: EncryptedEnvelope, maxCount: number, intervalMs: number, now=Date.now()): Promise<boolean> {
  if (!envelope || envelope.v !== 1 || !envelope.ciphertext || !envelope.salt) throw new Error('Verschlüsselte Sicherung ungültig.');
  const existing = await listLocalSnapshots();
  if (!snapshotDue(existing[0]?.createdAt ?? null,now,intervalMs)) return false;
  const id = SNAPSHOT_PREFIX + now;
  const {remove} = keepNewestSnapshots([...existing.map(x=>x.id),id],maxCount);
  const db = await connect();
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx = db.transaction(STORE,'readwrite');
      const store = tx.objectStore(STORE);
      // This transaction must not recreate snapshots of an obsolete master key
      // after a concurrent password rotation or vault restore.
      const live=store.get(KEY);
      live.onsuccess=()=>{
        const current=live.result as EncryptedEnvelope | undefined;
        if (!current || current.salt!==envelope.salt ||
            current.nonce!==envelope.nonce || current.ciphertext!==envelope.ciphertext) {
          tx.abort();
          return;
        }
        store.put(envelope,id);
        remove.forEach(key=>store.delete(key));
      };
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error ?? new Error('Sicherung fehlgeschlagen.'));
      tx.onabort=()=>reject(tx.error ?? new Error('Sicherung abgebrochen.'));
    });
  } finally {db.close();}
  return true;
}
