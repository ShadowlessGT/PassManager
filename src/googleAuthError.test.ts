import { describe, it, expect } from 'vitest';
import { googleSignInErrorText } from './googleAuthError';

describe('Google sign-in safe error messages', () => {
  it('recognizes Android developer certificate error', () => {
    expect(googleSignInErrorText({ message: 'ApiException: 10' })).toContain('Konfigurationsfehler 10');
  });
  it('recognizes user cancellation', () => {
    expect(googleSignInErrorText({ code: 'SIGN_IN_CANCELED' })).toContain('abgebrochen');
  });
  it('explains disabled provider', () => {
    expect(googleSignInErrorText({ code: 'auth/operation-not-allowed' })).toContain('Firebase');
  });
  it('never exposes raw OAuth tokens or credential messages', () => {
    const text = googleSignInErrorText({ message: 'token=secret credential invalid' });
    expect(text).not.toContain('secret');
    expect(text).not.toContain('credential');
  });
  it('includes only a safe error code', () => {
    expect(googleSignInErrorText({ code: 'auth/internal-error' })).toContain('auth/internal-error');
    expect(googleSignInErrorText({ code: 'auth/internal-error?token=secret' })).not.toContain('secret');
  });
});
