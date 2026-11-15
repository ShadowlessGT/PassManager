import { describe, expect, it } from 'vitest';
import { newVault } from './types';
import { makeCategory, upsertCategory, removeCategory, categoryAndDescendants } from './categories';

describe('nested categories', () => {
  it('includes children when filtering parent and prevents parent cycles', () => {
    let data = newVault();
    const parent = makeCategory('Arbeit');
    const child = {...makeCategory('Kunden'), parentId: parent.id};
    data = upsertCategory(data,parent);
    data = upsertCategory(data,child);
    expect([...categoryAndDescendants(data.categories??[], 'Arbeit')]).toEqual(['arbeit','kunden']);
    expect(() => upsertCategory(data,{...parent,parentId:child.id},parent.id)).toThrow(/eigener Unterordner/);
  });
  it('reparents descendants without deleting their categories',()=>{
    let data = newVault();
    const parent = makeCategory('Parent');
    const child = {...makeCategory('Child'), parentId:parent.id};
    data=upsertCategory(upsertCategory(data,parent),child);
    data=removeCategory(data,parent.id);
    expect(data.categories?.find(cat=>cat.id===child.id)?.parentId).toBeUndefined();
    expect(categoryAndDescendants(data.categories??[],'Child').has('child')).toBe(true);
  });
  it('allows valid custom hex colors but falls back on untrusted input',()=>{
    const valid=makeCategory('A','folder','#ee3399');
    expect(valid.color).toBe('#ee3399');
    expect(makeCategory('B','folder','red url(http://x)').color).not.toContain('url');
  });
});
