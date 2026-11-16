import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { createCategoryForEntry, categoriesForVault } from './categories';
import { blankEntry, newVault } from './types';
import { EntryIcon, ENTRY_ICON_CHOICES } from './entryIcons';
import EntryAvatar from './EntryAvatar';
import CategoryPicker from './CategoryPicker';

describe('entry-editor UX regression fixes', () => {
  it('creates and retains a new category independently of saving an entry', () => {
    const original = { ...newVault(), entries:[{ ...blankEntry(), title:'Existing', categories:[] }] };
    const created = createCategoryForEntry(original,'  Family Accounts  ');
    expect(created.name).toBe('Family Accounts');
    expect(categoriesForVault(created.vault).map(c=>c.name)).toContain('Family Accounts');
    expect(original.categories).toBeUndefined();
    expect(original.entries[0].categories).toEqual([]);
    expect(created.vault.entries[0].categories).toEqual([]);
  });
  it('reuses an existing category without duplicating it or changing its properties', () => {
    const original = createCategoryForEntry(newVault(),'Home').vault;
    const category=categoriesForVault(original)[0];
    const result=createCategoryForEntry(original,' home ');
    expect(result.vault).toBe(original);
    expect(result.name).toBe('Home');
    expect(result.vault.categories).toHaveLength(1);
    expect(categoriesForVault(result.vault)[0].id).toBe(category.id);
  });
  it('rejects empty and oversized categories', () => {
    expect(()=>createCategoryForEntry(newVault(),' ')).toThrow();
    expect(()=>createCategoryForEntry(newVault(),'x'.repeat(71))).toThrow();
  });
  it('renders category creation as a non-submit action in the entry picker', () => {
    const markup=renderToStaticMarkup(createElement(CategoryPicker,{
      available:[],selected:[],onChange:()=>{},
      onCreate:async(name:string)=>name
    }));
    expect(markup).toContain('Neue Kategorie');
    expect(markup).toContain('type="button"');
    expect(markup).not.toContain('type="submit"');
  });
  it('shows an entry photo rather than hiding it behind the chosen symbol', () => {
    const image = 'data:image/png;base64,AAABAA==';
    const item = { ...blankEntry(), icon: 'gaming', images: [image], title: 'Game account' };
    const withPhoto = renderToStaticMarkup(createElement(EntryAvatar, { item, allowRemote: false }));
    expect(withPhoto).toContain('<img');
    expect(withPhoto).toContain(image);
    const withIcon = renderToStaticMarkup(createElement(EntryAvatar, { item: { ...item, images: [] }, allowRemote: false }));
    expect(withIcon).toContain('<svg');
    expect(withIcon).not.toContain('<img');
  });
  it('offers real SVG symbols, not only the text labels', () => {
    expect(ENTRY_ICON_CHOICES.length).toBeGreaterThan(7);
    for (const option of ENTRY_ICON_CHOICES) {
      const markup=renderToStaticMarkup(createElement(EntryIcon,{id:option.id}));
      expect(markup).toContain('<svg');
    }
  });
});
