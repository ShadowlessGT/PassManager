import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { PrivacyScreen } from '@capacitor/privacy-screen';
import { fromBase64, toBase64 } from './crypto';

const KEY_ID = 'vault-unlock-key-v1';

export async function preparePrivacyScreen(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await PrivacyScreen.enable();
  }
}

export async function deviceUnlockSupported(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const status = await BiometricAuth.checkBiometry();
  return status.deviceIsSecure && (status.isAvailable || status.deviceIsSecure);
}

export async function biometricIsEnabled(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  return Boolean(await SecureStorage.getItem(KEY_ID));
}

async function confirmDeviceUnlock(): Promise<void> {
  if (!Capacitor.isNativePlatform()) throw new Error('Geräteentsperrung ist nur in der installierten App möglich.');
  const available = await deviceUnlockSupported();
  if (!available) throw new Error('Bitte zuerst eine sichere Gerätesperre einrichten.');
  await BiometricAuth.authenticate({
    reason: 'Sicheren Tresor entsperren',
    androidTitle: 'Parola entsperren',
    allowDeviceCredential: true
  });
}

export async function enableDeviceUnlock(key: CryptoKey): Promise<void> {
  await confirmDeviceUnlock();
  const bytes = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  try {
    await SecureStorage.setItem(KEY_ID, toBase64(bytes));
  } finally {
    bytes.fill(0);
  }
}

export async function disableDeviceUnlock(): Promise<void> {
  if (Capacitor.isNativePlatform()) await SecureStorage.removeItem(KEY_ID);
}

export async function unlockWithDevice(): Promise<CryptoKey> {
  await confirmDeviceUnlock();
  const encoded = await SecureStorage.getItem(KEY_ID);
  if (!encoded) throw new Error('Geräteentsperrung ist noch nicht eingerichtet.');
  const bytes = fromBase64(encoded);
  try {
    return await crypto.subtle.importKey('raw', bytes as BufferSource, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
  } finally {
    bytes.fill(0);
  }
}
