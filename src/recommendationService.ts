import { Capacitor, registerPlugin } from '@capacitor/core';

export const APP_NAME = 'Passwort Manager: Parola';
export const PLAY_PACKAGE = 'com.shadowlessstudios.passwordmanager';
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=' + PLAY_PACKAGE;
export const QR_ASSET = '/parola-play-qr.svg';

const NativeRecommend = registerPlugin<{ share(): Promise<void>; openStore(): Promise<void> }>('ParolaRecommend');

export function recommendationText(): string {
  return APP_NAME + '\n' + PLAY_URL;
}
export async function shareParola(): Promise<'shared' | 'copied' | 'cancelled'> {
  if (Capacitor.getPlatform() === 'android') {
    await NativeRecommend.share();
    return 'shared';
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: APP_NAME, text: APP_NAME, url: PLAY_URL });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(recommendationText());
  return 'copied';
}
export async function openParolaStore(): Promise<void> {
  if (Capacitor.getPlatform() === 'android') await NativeRecommend.openStore();
  else window.open(PLAY_URL, '_blank', 'noopener,noreferrer');
}
