import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, normalizePreferences } from './preferences';
import { SUPPORTED_LANGUAGES, applyLanguage, currentLanguage,
  detectDeviceLanguage, isRTL, resolveLanguage, tr, translationCoverage } from './i18n';

describe('world language strategy and settings', () => {
  it('provides precisely 20 distinct launch languages', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(20);
    expect(new Set(SUPPORTED_LANGUAGES.map(item => item.code)).size).toBe(20);
    expect(SUPPORTED_LANGUAGES.map(item => item.code)).toContain('tr');
    expect(SUPPORTED_LANGUAGES.map(item => item.code)).toContain('sw');
  });
  it('detects supported device languages including regions and secondary preferences', () => {
    expect(detectDeviceLanguage(['fr-CA'])).toBe('fr');
    expect(detectDeviceLanguage(['es-MX', 'en-GB'])).toBe('es');
    expect(detectDeviceLanguage(['zh-CN'])).toBe('zh-Hans');
    expect(detectDeviceLanguage(['zh-TW', 'fr-FR'])).toBe('fr');
    expect(detectDeviceLanguage(['xx-XX', 'en-US'])).toBe('en');
    expect(detectDeviceLanguage(['xx-XX'])).toBe('en');
    expect(resolveLanguage('tr', ['de-DE'])).toBe('tr');
  });
  it('retains automatic as default and migrates old preferences safely', () => {
    expect(DEFAULT_PREFERENCES.language).toBe('system');
    expect(normalizePreferences({ mode:'expert', appearance:'dark' }).language).toBe('system');
    expect(normalizePreferences({ language:'tr' }).language).toBe('tr');
    expect(normalizePreferences({ language:'__prototype__' }).language).toBe('system');
  });
  it('covers all core keys with a nonempty translation in every supported language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(translationCoverage(language.code)).toBe(1);
      expect(tr('common.password', language.code)).toBeTruthy();
    }
    expect(tr('nav.settings', 'fr')).toBe('Paramètres');
    expect(tr('nav.settings', 'tr')).toBe('Ayarlar');
  });
  it('handles RTL and in-memory language changes without altering vault settings', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('ur')).toBe(true);
    expect(isRTL('fa')).toBe(true);
    expect(isRTL('de')).toBe(false);
    applyLanguage('fr');
    expect(currentLanguage()).toBe('fr');
    expect(tr('common.save')).toBe('Enregistrer');
    applyLanguage('system', ['de-DE']);
    expect(currentLanguage()).toBe('de');
  });
});
