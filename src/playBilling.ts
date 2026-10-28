import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { getAuth } from 'firebase/auth';
import { getApps, getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const ULTRA_PRODUCT_ID = 'parola_ultra_lifetime';

type BillingProduct = { productId: string; title: string; description: string; price: string };
export type PlayPurchase = { productId: string; purchaseToken: string; state: 'PENDING' | 'PURCHASED' };
type PurchaseUpdate = { status: 'ok' | 'cancelled' | 'error'; message?: string; purchases: PlayPurchase[] };

interface ParolaBillingNative {
  getProduct(): Promise<BillingProduct>;
  purchase(options: { accountHash: string }): Promise<{ started: boolean }>;
  restore(): Promise<{ purchases: PlayPurchase[] }>;
  addListener(name: 'purchaseUpdated', listener: (event: PurchaseUpdate) => void): Promise<PluginListenerHandle>;
}
const native = registerPlugin<ParolaBillingNative>('ParolaBilling');
export const nativeBillingAvailable = Capacitor.getPlatform() === 'android';
const functions = () => getFunctions(getApp(), 'europe-west3');

function currentUser() {
  if (!getApps().length) throw new Error('Firebase-Konfiguration fehlt.');
  const user = getAuth(getApp()).currentUser;
  if (!user) throw new Error('Bitte zunächst mit dem Firebase-Konto anmelden.');
  return user;
}
async function accountHash(): Promise<string> {
  const uid = currentUser().uid;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(uid));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function ultraProduct(): Promise<BillingProduct> {
  if (!nativeBillingAvailable) throw new Error('Google Play Billing ist nur in der Android-App verfügbar.');
  return native.getProduct();
}
export async function startUltraPurchase(): Promise<void> {
  if (!nativeBillingAvailable) throw new Error('Der Google-Play-Kauf ist nur auf Android verfügbar.');
  await native.purchase({ accountHash: await accountHash() });
}
export async function verifyUltraToken(purchase: PlayPurchase): Promise<void> {
  currentUser();
  if (purchase.productId !== ULTRA_PRODUCT_ID || purchase.state !== 'PURCHASED') {
    throw new Error('Kauf ist noch nicht abgeschlossen.');
  }
  const verify = httpsCallable<{ purchaseToken: string }, { active: boolean }>(functions(), 'verifyPlayPurchase');
  const result = await verify({ purchaseToken: purchase.purchaseToken });
  if (!result.data.active) throw new Error('Google Play konnte den Kauf nicht bestätigen.');
  window.dispatchEvent(new Event('parola-license-changed'));
}
export async function restoreUltraPurchase(): Promise<{ restored: number; pending: number }> {
  if (!nativeBillingAvailable) throw new Error('Wiederherstellung nur in der Android-App verfügbar.');
  currentUser();
  const { purchases } = await native.restore();
  const pending = purchases.filter(p => p.state === 'PENDING').length;
  let restored = 0;
  for (const purchase of purchases) {
    if (purchase.state !== 'PURCHASED') continue;
    await verifyUltraToken(purchase);
    restored++;
  }
  return { restored, pending };
}
export async function checkPlayLicenseServer(): Promise<boolean> {
  if (!getApps().length || !getAuth(getApp()).currentUser) return false;
  const callable = httpsCallable<Record<string, never>, { active: boolean }>(functions(), 'refreshPlayEntitlement');
  const result = await callable({});
  window.dispatchEvent(new Event('parola-license-changed'));
  return result.data.active;
}
export async function onUltraPurchaseUpdated(callback: (update: PurchaseUpdate) => void): Promise<PluginListenerHandle | null> {
  if (!nativeBillingAvailable) return null;
  return native.addListener('purchaseUpdated', callback);
}
