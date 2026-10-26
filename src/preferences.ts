export type UiMode = 'simple' | 'expert';
export type Appearance = 'system' | 'light' | 'dark';
export type TextSize = 'normal' | 'large' | 'extra-large';
export type UserPreferences = {
  mode: UiMode;
  appearance: Appearance;
  textSize: TextSize;
  backgroundLockMs: number;
  idleLockMs: number;
};

export const LOCK_OPTIONS = [
  { value: 0, label: 'Sofort' },
  { value: 60_000, label: '1 Minute' },
  { value: 5 * 60_000, label: '5 Minuten' },
  { value: 10 * 60_000, label: '10 Minuten' },
  { value: 15 * 60_000, label: '15 Minuten' },
  { value: 30 * 60_000, label: '30 Minuten' },
  { value: 60 * 60_000, label: '1 Stunde' }
] as const;

export const IDLE_OPTIONS = LOCK_OPTIONS.filter(item => item.value !== 0);
export const DEFAULT_PREFERENCES: UserPreferences = {
  mode: 'simple',
  appearance: 'system',
  textSize: 'large',
  backgroundLockMs: 5 * 60_000,
  idleLockMs: 15 * 60_000
};
const PREFERENCE_KEY = 'passmanager.ui-preferences-v1';

export function normalizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFERENCES };
  const source = raw as Partial<UserPreferences>;
  const validBackground = LOCK_OPTIONS.some(option => option.value === source.backgroundLockMs);
  const validIdle = IDLE_OPTIONS.some(option => option.value === source.idleLockMs);
  return {
    mode: source.mode === 'expert' ? 'expert' : 'simple',
    appearance: source.appearance === 'light' || source.appearance === 'dark' ? source.appearance : 'system',
    textSize: source.textSize === 'normal' || source.textSize === 'extra-large' ? source.textSize : 'large',
    backgroundLockMs: validBackground ? source.backgroundLockMs! : DEFAULT_PREFERENCES.backgroundLockMs,
    idleLockMs: validIdle ? source.idleLockMs! : DEFAULT_PREFERENCES.idleLockMs
  };
}
export function loadPreferences(): UserPreferences {
  try {
    return normalizePreferences(JSON.parse(window.localStorage.getItem(PREFERENCE_KEY) || 'null'));
  } catch { return { ...DEFAULT_PREFERENCES }; }
}
export function savePreferences(preferences: UserPreferences) {
  try {
    // No secret values, keys or plaintext vault data are ever stored here.
    window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify(normalizePreferences(preferences)));
  } catch { /* Still usable if WebView storage is disabled */ }
}
export function shouldLockAfterBackground(start: number | null, now: number, durationMs: number): boolean {
  if (start === null) return false;
  return now - start >= durationMs;
}
export function shouldLockAfterIdle(lastActivity: number, now: number, durationMs: number): boolean {
  return now - lastActivity >= durationMs;
}
