import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHROME_ITEM_PATTERN, GOOGLE_CLIENT_PATTERN, reportText } from './browser-store-setup.mjs';

describe('One-time Parola browser store registration', () => {
  it('accepts only Chrome Web Store item IDs (32 lower-case letters a-p)', () => {
    assert.equal(CHROME_ITEM_PATTERN.test('abcdefghijklmnopabcdefghijklmnop'),true);
    assert.equal(CHROME_ITEM_PATTERN.test('abcdefghijklmnopabcdefghijklmnop1'),false);
    assert.equal(CHROME_ITEM_PATTERN.test('ABCDEFGHIJKLMNOPABCDEFGHIJKLMNOP'),false);
    assert.equal(CHROME_ITEM_PATTERN.test('not-an-item-id'),false);
  });
  it('accepts Google OAuth client IDs but not client secrets or API keys', () => {
    assert.equal(GOOGLE_CLIENT_PATTERN.test('693424731365-abc123.apps.googleusercontent.com'),true);
    assert.equal(GOOGLE_CLIENT_PATTERN.test('AIzaSyTHIS_IS_NOT_AN_OAUTH_CLIENT'),false);
    assert.equal(GOOGLE_CLIENT_PATTERN.test('GOCSPX-secret-not-for-extensions'),false);
  });
  it('produces a concise report without private API credentials', () => {
    const report=reportText({
      VITE_GOOGLE_CHROME_EXTENSION_ID:'abcdefghijklmnopabcdefghijklmnop',
      VITE_GOOGLE_CHROME_OAUTH_CLIENT_ID:'1234567890-test.apps.googleusercontent.com',
      VITE_FIREBASE_API_KEY:'SECRET_API_KEY_FOR_TEST'
    },{enabled:true,webClientMatches:true});
    assert.match(report,/password-manager-parola/);
    assert.match(report,/Chrome Extension/);
    assert.match(report,/abcdefghijklmnopabcdefghijklmnop/);
    assert.ok(!report.includes('SECRET_API_KEY_FOR_TEST'));
    assert.ok(!report.includes('GOCSPX-'));
  });
});
