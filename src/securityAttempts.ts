/** Local failed master password attempts. This is a convenience policy, not a tamper-proof counter.
 * Attacks against copied ciphertext or a cleared WebView storage cannot be prevented.
 */
const ATTEMPT_KEY = 'passmanager.security.failed-unlocks-v1';

export function failedUnlocks(): number {
  try {
    const value = Number(localStorage.getItem(ATTEMPT_KEY) || '0');
    return Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : 0;
  } catch { return 0; }
}

export function registerFailedUnlock(): number {
  const next = Math.min(failedUnlocks() + 1, 1_000_000);
  try { localStorage.setItem(ATTEMPT_KEY, String(next)); }
  catch { /* Unavailable persistent storage must never trigger a forced wipe. */ }
  return failedUnlocks();
}

export function resetFailedUnlocks(): void {
  try { localStorage.removeItem(ATTEMPT_KEY); } catch { /* ignore */ }
}

export function shouldSelfDestruct(enabled: boolean, maximum: number, failed: number): boolean {
  return enabled && [5, 10, 15, 20].includes(maximum) && failed >= maximum;
}
