import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, normalizePreferences, shouldLockAfterBackground, shouldLockAfterIdle } from './preferences';

describe('lock security and UI preferences', () => {
  it('keeps the app unlocked on short background visits', () => {
    expect(shouldLockAfterBackground(1_000, 20_000, 60_000)).toBe(false);
    expect(shouldLockAfterBackground(1_000, 61_000, 60_000)).toBe(true);
    expect(shouldLockAfterBackground(1_000, 1_000, 0)).toBe(true);
    expect(shouldLockAfterBackground(null, 900_000, 0)).toBe(false);
  });
  it('locks on the configurable idle deadline', () => {
    expect(shouldLockAfterIdle(0, 59_999, 60_000)).toBe(false);
    expect(shouldLockAfterIdle(0, 60_000, 60_000)).toBe(true);
  });
  it('does not trust invalid local preferences', () => {
    expect(normalizePreferences({ mode:'expert', backgroundLockMs:-1, idleLockMs:Infinity }))
      .toEqual({ ...DEFAULT_PREFERENCES, mode:'expert' });
  });
});
