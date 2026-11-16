import { describe, expect, it } from 'vitest';
import { shouldAutomaticallyPromptDeviceUnlock, type AutomaticUnlockState } from './automaticDeviceUnlock';

const configured = (): AutomaticUnlockState => ({
  loading: false, hasVault: true, deviceSupported: true,
  deviceEnabled: true, working: false, unlocked: false, attempted: false
});

describe('automatic biometric unlock on cold start', () => {
  it('starts exactly once when encrypted local vault and device enrollment are ready', () => {
    expect(shouldAutomaticallyPromptDeviceUnlock(configured())).toBe(true);
    expect(shouldAutomaticallyPromptDeviceUnlock({ ...configured(), attempted: true })).toBe(false);
  });
  it('does not open authentication before initialization is complete', () => {
    expect(shouldAutomaticallyPromptDeviceUnlock({ ...configured(), loading: true })).toBe(false);
    expect(shouldAutomaticallyPromptDeviceUnlock({ ...configured(), hasVault: false })).toBe(false);
    expect(shouldAutomaticallyPromptDeviceUnlock({ ...configured(), deviceSupported: false })).toBe(false);
    expect(shouldAutomaticallyPromptDeviceUnlock({ ...configured(), deviceEnabled: false })).toBe(false);
  });
  it('does not trigger when unlocked or while another unlock request is running', () => {
    expect(shouldAutomaticallyPromptDeviceUnlock({ ...configured(), unlocked: true })).toBe(false);
    expect(shouldAutomaticallyPromptDeviceUnlock({ ...configured(), working: true })).toBe(false);
  });
});
