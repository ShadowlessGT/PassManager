import type { Appearance } from './preferences';

export type ResolvedAppearance = 'light' | 'dark';
export const APPEARANCE_CHOICES = [['light', 'Hell'], ['dark', 'Dunkel']] as const;

export function resolveAppearance(preference: Appearance, systemPrefersDark: boolean): ResolvedAppearance {
  return preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;
}

export function applyResolvedAppearance(appearance: ResolvedAppearance): void {
  document.documentElement.dataset.theme = appearance;
  document.documentElement.style.colorScheme = appearance;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', appearance === 'light' ? '#f6f8fa' : '#0e1113');
}
