import type { VaultEntry } from './types';

/** Free keeps the essential login fields without an entry-count limit. */
export function freeEntryEditError(previous: VaultEntry | undefined, next: VaultEntry): string | null {
  for (const key of ['description', 'notes', 'person'] as const) {
    if (next[key]?.trim() && next[key] !== previous?.[key]) {
      return 'Eigene Notizen, Beschreibungen und Personen benötigen Parola Ultra.';
    }
  }
  // Existing migrated images must remain readable/removable in Free, but
  // adding or replacing any attachment requires an active Ultra entitlement.
  // This guard is repeated at save time, not merely hidden in the UI.
  const previouslyStoredImages = new Set(previous?.images ?? []);
  if (next.images.some(image => !previouslyStoredImages.has(image))) {
    return 'Neue Bilder und Anhänge benötigen Parola Ultra.';
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
