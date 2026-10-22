import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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

export async function cloudUpload(envelope: EncryptedEnvelope): Promise<void> {
  const uid = requireCloudUser();
  await setDoc(doc(db!, 'vaults', uid), { envelope, updatedAt: serverTimestamp() });
}

export async function cloudDownload(): Promise<EncryptedEnvelope | null> {
  const uid = requireCloudUser();
  const snapshot = await getDoc(doc(db!, 'vaults', uid));
  if (!snapshot.exists()) return null;
  const envelope = snapshot.data().envelope as EncryptedEnvelope;
  if (!envelope || envelope.v !== 1 || typeof envelope.ciphertext !== 'string') throw new Error('Ungültige Cloud-Daten.');
  return envelope;
}
