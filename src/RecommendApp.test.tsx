import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SUPPORTED_LANGUAGES, applyLanguage } from './i18n';
import { RECOMMEND_TEXT } from './recommendI18n';
const native = vi.hoisted(() => ({ share: vi.fn(), openStore: vi.fn(), platform: vi.fn() }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: native.platform },
  registerPlugin: () => ({ share: native.share, openStore: native.openStore })
}));
import RecommendApp from './RecommendApp';
import { APP_NAME, PLAY_PACKAGE, PLAY_URL, QR_ASSET, recommendationText, shareParola, openParolaStore } from './recommendationService';

describe('Parola recommendations', () => {
  beforeEach(() => { vi.clearAllMocks(); native.platform.mockReturnValue('android'); });
  it('always shares the public production link', () => {
    expect(PLAY_PACKAGE).toBe('com.shadowlessstudios.passwordmanager');
    expect(PLAY_URL).toBe('https://play.google.com/store/apps/details?id=com.shadowlessstudios.passwordmanager');
    expect(recommendationText()).toBe(APP_NAME + '\n' + PLAY_URL);
    expect(QR_ASSET).toBe('/parola-play-qr.svg');
  });
  it('covers all 20 supported languages', () => {
    expect(Object.keys(RECOMMEND_TEXT).sort()).toEqual(SUPPORTED_LANGUAGES.map(l => l.code).sort());
    for (const language of SUPPORTED_LANGUAGES) {
      expect(RECOMMEND_TEXT[language.code]).toHaveLength(7);
      expect(RECOMMEND_TEXT[language.code].every(Boolean)).toBe(true);
    }
  });
  it('renders accessible actions and local QR on the dialog', () => {
    applyLanguage('de');
    const html = renderToStaticMarkup(<RecommendApp onClose={() => {}}/>);
    expect(html).toContain('App teilen');
    expect(html).toContain('Google Play öffnen');
    expect(html).toContain('/parola-play-qr.svg');
    expect(html).toContain('aria-label="Schließen"');
  });
  it('dispatches native Android share without sending vault data', async () => {
    native.share.mockResolvedValue(undefined);
    expect(await shareParola()).toBe('shared');
    expect(native.share).toHaveBeenCalledWith();
  });
  it('dispatches native Play navigation', async () => {
    native.openStore.mockResolvedValue(undefined);
    await openParolaStore();
    expect(native.openStore).toHaveBeenCalledWith();
  });
  it('does not pretend sharing succeeded when Android rejects it', async () => {
    native.share.mockRejectedValue(new Error('unavailable'));
    await expect(shareParola()).rejects.toThrow('unavailable');
  });
});
