import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { EncryptedEnvelope } from './crypto';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const cloudConfigured = Object.values(firebaseConfig).every(Boolean);
const app = cloudConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

export function cloudEmail(): string | null {
  return auth?.currentUser?.email ?? null;
}

export async function cloudSignIn(email: string, password: string, createAccount: boolean): Promise<void> {
  if (!auth) throw new Error('Firebase ist noch nicht konfiguriert.');
  if (createAccount) await createUserWithEmailAndPassword(auth, email, password);
  else await signInWithEmailAndPassword(auth, email, password);
}

export async function cloudSignOut(): Promise<void> {
  if (auth) await signOut(auth);
}

function requireCloudUser(): string {
  if (!auth?.currentUser || !db) throw new Error('Bitte zuerst bei Firebase anmelden.');
  return auth.currentUser.uid;
}

export async function cloudUpload(envelope: EncryptedEnvelope, expectedRevision: string | null): Promise<void> {
  const uid = requireCloudUser();
  const ref = doc(db!, 'vaults', uid);
  await runTransaction(db!, async transaction => {
    const saved = await transaction.get(ref);
    const current = saved.exists() ? saved.data().envelope as EncryptedEnvelope : null;
    const revision = current ? current.nonce + ':' + current.updatedAt : null;
    if (revision !== expectedRevision) throw new Error('CLOUD_CONFLICT');
    transaction.set(ref, { envelope, updatedAt: serverTimestamp() });
  });
}

export async function cloudDownload(): Promise<EncryptedEnvelope | null> {
  const uid = requireCloudUser();
  const snapshot = await getDoc(doc(db!, 'vaults', uid));
  if (!snapshot.exists()) return null;
  const envelope = snapshot.data().envelope as EncryptedEnvelope;
  if (!envelope || envelope.v !== 1 || typeof envelope.ciphertext !== 'string') throw new Error('UngÃ¼ltige Cloud-Daten.');
  return envelope;
}

export function onCloudEmailChange(callback: (email: string | null) => void): () => void {
  return auth ? onAuthStateChanged(auth, user => callback(user?.email ?? null)) : () => {};
}

/** Deletes the signed-in user's Firebase account. Never touches the local encrypted vault.
 * While Functions cannot run on Spark, clients may delete only their own Firestore documents.
 * Accounts with server-assigned premium entitlements must wait for privileged server cleanup.
 */
export async function cloudDeleteAccount(accountPassword: string): Promise<void> {
  const user = auth?.currentUser;
  if (!user?.email || !db) throw new Error('Bitte zuerst bei Firebase anmelden.');
  if (!accountPassword) throw new Error('Kontopasswort erforderlich.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, accountPassword));
  const uid = user.uid;

  if (import.meta.env.VITE_DELETE_ACCOUNT_BACKEND === 'functions') {
    if (!app) throw new Error('Firebase fehlt.');
    const remove = httpsCallable<{ confirm: string }, { deleted: boolean }>(
      getFunctions(app, 'europe-west3'), 'deleteOwnAccount');
    const response = await remove({ confirm: 'DELETE' });
    if (!response.data.deleted) throw new Error('KontolÃ¶schung nicht bestÃ¤tigt.');
    await signOut(auth!);
    return;
  }

  const entitlement = await getDoc(doc(db, 'accessEntitlements', uid));
  if (entitlement.exists()) throw new Error('SERVER_CLEANUP_REQUIRED: Premium-Berechtigung vorhanden.');
  // The account is deleted LAST, so a failed Firestore operation can be retried
  // with the existing Firebase credentials. All documents are scoped to this UID.
  await deleteDoc(doc(db, 'vaults', uid));

  await deleteUser(user);
  await signOut(auth!);
}
