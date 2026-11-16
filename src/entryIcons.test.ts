import { describe, expect, it } from 'vitest';
import { ENTRY_ICON_CHOICES, entryIconFor } from './entryIcons';

describe('Password Safe per-entry icon compatibility', () => {
  it('supports every distinct identifier in the inspected source database', () => {
    const sourceIds = ['house','health','account','world','twitter',
      'mail','gaming','car','animal'];
    expect(ENTRY_ICON_CHOICES.map(choice => choice.id).sort()).toEqual(sourceIds.sort());
    expect(new Set(sourceIds).size).toBe(9);
    for (const id of sourceIds) {
      expect(typeof entryIconFor(id)).toBe('object');
    }
  });
  it('keeps a safe fallback for a future or unknown source identifier', () => {
    expect(entryIconFor('new-icon-from-backup')).toBe(entryIconFor(undefined));
  });
});
