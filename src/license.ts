import { getAuth, getIdTokenResult } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { cloudConfigured } from './cloud';
import { getApp, getApps } from 'firebase/app';

export type AccessEntitlement = { tier: 'pro'; source: 'admin_gift' | 'google_play'; expiresAt: { toMillis: () => number } | null };

function firebase() {
  if (!cloudConfigured || getApps().length === 0) throw new Error('Firebase ist noch nicht konfiguriert.');
  return getApp();
}

export async function lookupLicense(): Promise<{ active: boolean; lifetime: boolean; expiresAt: number | null }> {
  const app = firebase();
  const uid = getAuth(app).currentUser?.uid;
  if (!uid) return { active: false, lifetime: false, expiresAt: null };
  const docRef = doc(getFirestore(app), 'accessEntitlements', uid);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return { active: false, lifetime: false, expiresAt: null };
  const grant = snapshot.data() as AccessEntitlement;
  const expiresAt = grant.expiresAt?.toMillis?.() ?? null;
  return { active: grant.tier === 'pro' && (!expiresAt || expiresAt > Date.now()), lifetime: grant.tier === 'pro' && !expiresAt, expiresAt };
}

export async function redeemGiftCode(code: string): Promise<{ active: boolean; lifetime: boolean; expiresAt: number | null }> {
  const callable = httpsCallable<{ code: string }, { active: boolean; lifetime: boolean; expiresAt: number | null }>(getFunctions(firebase(), 'europe-west3'), 'redeemGiftCode');
  return (await callable({ code })).data;
}

export async function isAdmin(): Promise<boolean> {
  const user = getAuth(firebase()).currentUser;
  return user ? (await getIdTokenResult(user)).claims.passmanagerAdmin === true : false;
}

export async function adminCreateCodes(count: number, days: number): Promise<string[]> {
  if (!await isAdmin()) throw new Error('Keine Adminberechtigung.');
  const callable = httpsCallable<{ count: number; days: number }, { codes: string[] }>(getFunctions(firebase(), 'europe-west3'), 'adminCreateGiftCodes');
  return (await callable({ count, days })).data.codes;
}
