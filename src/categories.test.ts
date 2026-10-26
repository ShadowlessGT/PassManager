import { describe, expect, it } from 'vitest';
import { blankEntry, newVault } from './types';
import { categoriesForVault, ensureEntryCategories, makeCategory, removeCategory, upsertCategory } from './categories';

describe('categories are containers, not passwords', () => {
  it('reads old vault category names without losing their entries', () => {
    const entry = { ...blankEntry(), categories:['Router', 'Familie'] };
    const old = { ...newVault(), entries:[entry] };
    const found = categoriesForVault(old);
    expect(found.map(c => c.name)).toEqual(['Familie','Router']);
    expect(old.entries[0].categories).toEqual(['Router','Familie']);
  });
  it('creates empty categories and can rename them across assigned entries', () => {
    const base = upsertCategory(newVault(), makeCategory('Privat'));
    expect(categoriesForVault(base).length).toBe(1);
    const item = { ...blankEntry(), categories:['Privat'] };
    const populated = ensureEntryCategories({ ...base, entries:[item] }, item);
    const renamed = upsertCategory(populated, { ...base.categories![0], name:'Familie' }, base.categories![0].id);
    expect(renamed.entries[0].categories).toEqual(['Familie']);
    const deleted = removeCategory(renamed, renamed.categories![0].id);
    expect(deleted.entries).toHaveLength(1);
    expect(deleted.entries[0].password).toBe(item.password);
    expect(deleted.entries[0].categories).toEqual([]);
  });
  it('deduplicates case insensitive categories', () => {
    const entry = { ...blankEntry(), categories:['Router','router',' ROuTER '] };
    const out = ensureEntryCategories({ ...newVault(),entries:[entry] },entry);
    expect(out.entries[0].categories).toEqual(['Router']);
    expect(out.categories?.length).toBe(1);
  });
});
