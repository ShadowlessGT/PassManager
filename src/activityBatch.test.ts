import { describe, expect, it } from 'vitest';
import { blankEntry, newVault } from './types';
import { applyActivityBatch } from './activityBatch';
import { visiblePreviousPasswords } from './insights';

describe('fast entry detail and safe history rendering', () => {
  it('shows only genuinely previous passwords without changing imported ciphertext data', () => {
    const entry = {
      ...blankEntry(),
      password: 'current-example',
      passwordHistory: [
        { value: 'old-example', replacedAt: 100 },
        { value: 'current-example', replacedAt: 200 },
        { value: '', replacedAt: 300 }
      ]
    };
    expect(visiblePreviousPasswords(entry)).toEqual([{ value: 'old-example', replacedAt: 100 }]);
    expect(entry.passwordHistory).toHaveLength(3);
  });

  it('batches open, reveal and copy into one vault update without changing secrets', () => {
    const first = { ...blankEntry(), id: 'a', password: 'a-strong-secret', title: 'A' };
    const second = { ...blankEntry(), id: 'b', password: 'another-secret', title: 'B' };
    const vault = { ...newVault(), entries: [first, second] };
    const saved = applyActivityBatch(vault, [
      { entryId: 'a', kind: 'open', at: 100 },
      { entryId: 'a', kind: 'reveal', at: 110 },
      { entryId: 'a', kind: 'copy', fieldType: 'Passwort', at: 120 },
      { entryId: 'a', kind: 'open', at: 130 }
    ]);
    expect(saved.entries[0].activity).toMatchObject({
      opens: 2, reveals: 1, copies: 1,
      lastOpenedAt: 130, lastUsedAt: 130, fieldCopies: { Passwort: 1 }
    });
    expect(saved.entries[0].password).toBe('a-strong-secret');
    expect(saved.entries[1]).toBe(second);
    expect(vault.entries[0].activity).toBeUndefined();
  });

  it('does not save nonexistent record activity or empty batches', () => {
    const vault = { ...newVault(), entries: [blankEntry()] };
    expect(applyActivityBatch(vault, [])).toBe(vault);
    expect(applyActivityBatch(vault, [{ entryId: 'unknown', kind: 'open', at: 123 }])).toBe(vault);
  });
});
