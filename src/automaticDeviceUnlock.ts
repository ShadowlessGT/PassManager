/** One automatic device-auth request per real app mount, never on manual vault lock. */
export type AutomaticUnlockState = {
  loading: boolean;
  hasVault: boolean;
  deviceSupported: boolean;
  deviceEnabled: boolean;
  working: boolean;
  unlocked: boolean;
  attempted: boolean;
};

export function shouldAutomaticallyPromptDeviceUnlock(state: AutomaticUnlockState): boolean {
  return !state.loading && state.hasVault && state.deviceSupported &&
    state.deviceEnabled && !state.working && !state.unlocked && !state.attempted;
}
