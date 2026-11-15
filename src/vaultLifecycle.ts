import type { VaultData, VaultEntry } from './types';

export type EntryLocation = 'active' | 'archived' | 'trashed';

export function entryLocation(entry: VaultEntry): EntryLocation {
  return entry.lifecycle?.state === 'archived' || entry.lifecycle?.state === 'trashed'
    ? entry.lifecycle.state : 'active';
}
export function entriesAt(vault: VaultData, location: EntryLocation): VaultEntry[] {
  return vault.entries.filter(entry => entryLocation(entry) === location);
}
export function moveEntry(vault: VaultData, id: string, location: EntryLocation, at = Date.now()): VaultData {
  if (!vault.entries.some(entry => entry.id === id)) throw new Error('Eintrag existiert nicht.');
  return { ...vault, entries: vault.entries.map(entry => entry.id !== id ? entry : {
    ...entry, lifecycle: location === 'active' ? undefined : { state: location, changedAt: at }
  }) };
}
export function eraseTrashedEntry(vault: VaultData, id: string): VaultData {
  const entry = vault.entries.find(item => item.id === id);
  if (!entry || entryLocation(entry) !== 'trashed') throw new Error('Nur Einträge im Papierkorb können dauerhaft gelöscht werden.');
  return { ...vault, entries: vault.entries.filter(item => item.id !== id) };
}
