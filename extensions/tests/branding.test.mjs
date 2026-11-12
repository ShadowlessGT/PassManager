import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../browser/', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

describe('Parola browser branding matches the official mobile app in German', () => {
  const de = read('_locales/de/messages.json');
  const en = read('_locales/en/messages.json');

  it('uses the official bilingual names', () => {
    assert.equal(de.extensionName.message, 'Passwort Manager: Parola');
    assert.equal(en.extensionName.message, 'Password Manager: Parola');
    assert.ok(de.extensionDescription.message.includes('Zustimmung'));
    assert.ok(en.extensionDescription.message.includes('consent'));
  });

  for (const browser of ['chrome', 'firefox']) {
    it('has consistent localized manifest metadata and a bumped draft version for ' + browser, () => {
      const manifest = read('manifest.' + browser + '.json');
      assert.equal(manifest.name, '__MSG_extensionName__');
      assert.equal(manifest.description, '__MSG_extensionDescription__');
      assert.equal(manifest.default_locale, 'en');
      assert.equal(manifest.version, '0.3.1');
    });
  }
});
