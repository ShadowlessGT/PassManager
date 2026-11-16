import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { SUPPORTED_LANGUAGES, applyLanguage } from './i18n';
import AutofillSetupGuide from './AutofillSetupGuide';
import { autofillGuide, AUTOFILL_GUIDES } from './autofillGuideI18n';

describe('Android Autofill / Chrome help in all supported locales', () => {
  it('covers every installed UI language with complete translated steps', () => {
    expect(Object.keys(AUTOFILL_GUIDES).sort()).toEqual(
      SUPPORTED_LANGUAGES.map(item => item.code).sort()
    );
    for (const locale of SUPPORTED_LANGUAGES) {
      const help = autofillGuide(locale.code);
      expect(help.androidSteps).toHaveLength(2);
      expect(help.chromeSteps).toHaveLength(4);
      expect(help.testSteps).toHaveLength(2);
      for (const text of [
        help.title, help.teaser, help.expand, help.androidTitle,
        ...help.androidSteps, help.chromeTitle, ...help.chromeSteps,
        help.testTitle, ...help.testSteps, help.troubleshootingTitle,
        help.troubleshooting, help.limitation
      ]) {
        expect(text.trim().length).toBeGreaterThan(6);
        expect(text).not.toContain('???');
      }
      expect(help.chromeSteps.some(text => text.includes('Google'))).toBe(true);
      expect(help.chromeSteps.some(text => text.includes('Chrome'))).toBe(true);
      expect(help.androidSteps.some(text => text.includes('Parola'))).toBe(true);
      expect(help.testSteps.some(text => text.includes('Parola'))).toBe(true);
    }
  });

  it('renders in the currently selected language and changes with the app language', () => {
    try {
      applyLanguage('de');
      const german = renderToStaticMarkup(createElement(AutofillSetupGuide));
      expect(german).toContain('Passwörter mit Parola erkennen');
      expect(german).toContain('Chrome kann weiterhin Google nutzen');
      expect(german).toContain('aria-expanded="false"');

      applyLanguage('en');
      const english = renderToStaticMarkup(createElement(AutofillSetupGuide));
      expect(english).toContain('Save passwords with Parola');
      expect(english).toContain('Chrome may still use Google');

      applyLanguage('tr');
      const turkish = renderToStaticMarkup(createElement(AutofillSetupGuide));
      expect(turkish).toContain('Parola ile şifre kaydetme');
      expect(turkish).toContain('Chrome hâlâ Google');
    } finally {
      applyLanguage('de');
    }
  });
});
