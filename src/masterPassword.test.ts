import { describe, expect, it } from 'vitest';
import { validateNewMasterPassword, masterPasswordStrength } from './masterPassword';

describe('master password setup policy', () => {
  it('accepts six-character secrets without changing existing vault unlock', () => {
    expect(validateNewMasterPassword('xQ7!aZ', 'xQ7!aZ')).toBeNull();
    expect(masterPasswordStrength('xQ7!aZ')).toBe('below-recommendation');
  });
  it('recommends twelve or more', () => {
    expect(masterPasswordStrength('Good Example 2026!')).toBe('recommended');
    expect(validateNewMasterPassword('123456789012', '123456789012')).toBeNull();
  });
  it('rejects shorter passwords and mismatched confirmation', () => {
    expect(validateNewMasterPassword('12345', '12345')).toContain('6');
    expect(validateNewMasterPassword('abcdef', 'fedcba')).toContain('stimmen nicht');
    expect(masterPasswordStrength('12345')).toBe('too-short');
  });
});
