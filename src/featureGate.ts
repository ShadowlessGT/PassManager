import type { VaultEntry } from './types';

/** Free keeps the essential login fields without an entry-count limit. */
export function freeEntryEditError(previous: VaultEntry | undefined, next: VaultEntry): string | null {
  for (const key of ['description', 'notes', 'person'] as const) {
    if (next[key]?.trim() && next[key] !== previous?.[key]) {
      return 'Eigene Notizen, Beschreibungen und Personen benötigen Parola Ultra.';
    }
  }
  const previousImages = previous?.images ?? [];
  if ((next.images ?? []).some(image => !previousImages.includes(image))) {
    return 'Neue Bildanhänge benötigen Parola Ultra.';
  }
  const oldFields = previous?.fields ?? [];
  if ((next.fields ?? []).some(field =>
    !oldFields.some(old => old.id === field.id &&
      old.label === field.label && old.kind === field.kind && old.value === field.value))) {
    return 'Zusätzliche oder geänderte eigene Felder benötigen Parola Ultra.';
  }
  if (next.keepPasswordHistory && !previous?.keepPasswordHistory) {
    return 'Das Aktivieren der Passwort-Historie benötigt Parola Ultra.';
  }
  return null;
}
