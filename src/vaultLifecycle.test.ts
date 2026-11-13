import { describe, it, expect } from 'vitest';
import { blankEntry, newVault } from './types';
import { entriesAt, moveEntry, eraseTrashedEntry, entryLocation } from './vaultLifecycle';

describe('archived and deleted credentials', () => {
  const initial = () => ({...newVault(), entries: [{...blankEntry(), id: 'one', title:'Example', password:'private'}]});
  it('does not expose archived entries as active and restores without changing secrets', () => {
    const archived = moveEntry(initial(),'one','archived',42);
    expect(entriesAt(archived,'active')).toHaveLength(0);
    expect(entriesAt(archived,'archived')[0].password).toBe('private');
    const restored = moveEntry(archived,'one','active');
    expect(entryLocation(restored.entries[0])).toBe('active');
    expect(restored.entries[0].lifecycle).toBeUndefined();
  });
  it('requires trash before permanent removal', () => {
    expect(() => eraseTrashedEntry(initial(),'one')).toThrow();
    const trashed = moveEntry(initial(),'one','trashed');
    expect(entriesAt(trashed,'trashed')).toHaveLength(1);
    expect(eraseTrashedEntry(trashed,'one').entries).toHaveLength(0);
  });
  it('cannot change a nonexistent entry', () => {
    expect(() => moveEntry(initial(),'missing','archived')).toThrow();
  });
});
