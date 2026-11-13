import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { failedUnlocks, registerFailedUnlock, resetFailedUnlocks, shouldSelfDestruct } from './securityAttempts';
import { DEFAULT_PREFERENCES, normalizePreferences, CLIPBOARD_OPTIONS } from './preferences';

describe('Parola security settings', () => {
  const data = new Map<string,string>();
  beforeEach(() => {
    data.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k,v),
      removeItem: (k: string) => data.delete(k)
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('defaults to secure screen and screen-off locking, with destructive mode off', () => {
    const p = normalizePreferences(null);
    expect(p.screenshotsAllowed).toBe(false);
    expect(p.screenOffLock).toBe(true);
    expect(p.selfDestructEnabled).toBe(false);
    expect(p.clipboardClearMs).toBe(120_000);
    expect(DEFAULT_PREFERENCES).toMatchObject(p);
  });

  it('rejects unsafe local preference values on load', () => {
    const p = normalizePreferences({
      screenOffLock: 'false',
      screenshotsAllowed: 'true',
      selfDestructEnabled: 'true',
      selfDestructMaxAttempts: 1,
      clipboardClearMs: -10
    });
    expect(p.screenOffLock).toBe(true);
    expect(p.screenshotsAllowed).toBe(false);
    expect(p.selfDestructEnabled).toBe(false);
    expect(p.selfDestructMaxAttempts).toBe(10);
    expect(p.clipboardClearMs).toBe(120_000);
    expect(CLIPBOARD_OPTIONS).toHaveLength(5);
  });

  it('counts local attempts and triggers only when explicitly enabled and threshold reached', () => {
    expect(failedUnlocks()).toBe(0);
    for (let i=0;i<4;i++) registerFailedUnlock();
    expect(shouldSelfDestruct(false, 5, failedUnlocks())).toBe(false);
    expect(shouldSelfDestruct(true, 5, failedUnlocks())).toBe(false);
    registerFailedUnlock();
    expect(shouldSelfDestruct(true, 5, failedUnlocks())).toBe(true);
    resetFailedUnlocks();
    expect(failedUnlocks()).toBe(0);
  });

  it('never deletes on an invalid/malformed threshold', () => {
    expect(shouldSelfDestruct(true, 0, 1000)).toBe(false);
    expect(shouldSelfDestruct(true, -1, 1000)).toBe(false);
  });
});
