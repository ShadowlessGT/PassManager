import type { VaultCategory, VaultData, VaultEntry } from './types';

export const CATEGORY_COLORS = ['#4F9FA5','#6A96B8','#CDA66A','#C47B85','#78957D','#879FA5','#A1A8BB'] as const;
export const CATEGORY_ICONS = [
  { value:'folder', label:'Ordner' }, { value:'home', label:'Zuhause' },
  { value:'briefcase', label:'Arbeit' }, { value:'wallet', label:'Finanzen' },
  { value:'shopping-bag', label:'Einkaufen' }, { value:'heart', label:'Familie' },
  { value:'wifi', label:'Netzwerk' }, { value:'gamepad-2', label:'Spiele' },
  { value:'car', label:'Auto' }, { value:'graduation-cap', label:'Lernen' }
] as const;
export const categoryKey = (value: string) => value.trim().toLocaleLowerCase('de');

export function makeCategory(name: string, icon = 'folder', color: string = CATEGORY_COLORS[0]): VaultCategory {
  const normalizedName = name.trim();
  if (!normalizedName || normalizedName.length > 70)
    throw new Error('Kategorie benötigt einen Namen mit höchstens 70 Zeichen.');
  return {
    id: crypto.randomUUID(),
    name: normalizedName,
    icon: CATEGORY_ICONS.some(item => item.value === icon) ? icon : 'folder',
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : CATEGORY_COLORS[0]
  };
}

/**
 * Create a category independently of an entry. Its persistence must not
 * depend on the user later saving the entry editor.
 */
export function createCategoryForEntry(vault: VaultData, name: string): { vault: VaultData; name: string } {
  const candidate = name.trim();
  if (!candidate || candidate.length > 70)
    throw new Error('Kategorie benötigt einen Namen mit höchstens 70 Zeichen.');
  const match = categoriesForVault(vault).find(item => categoryKey(item.name) === categoryKey(candidate));
  if (match) return { vault, name: match.name };
  const category = makeCategory(candidate);
  return { vault: upsertCategory(vault, category), name: category.name };
}

// Old vaults only stored category strings on entries. Keep their names and
// assignments, and transparently present those as regular categories.
export function categoriesForVault(vault: VaultData): VaultCategory[] {
  const found = new Map<string, VaultCategory>();
  for (const category of vault.categories ?? []) {
    const key = categoryKey(category.name);
    if (key && !found.has(key)) found.set(key, category);
  }
  for (const entry of vault.entries) {
    for (const name of entry.categories) {
      const key = categoryKey(name);
      if (key && !found.has(key)) found.set(key, { ...makeCategory(name), id:'legacy-'+encodeURIComponent(key) });
    }
  }
  return [...found.values()].sort((a,b) => a.name.localeCompare(b.name, 'de'));
}
export function ensureEntryCategories(vault: VaultData, entry: VaultEntry): VaultData {
  const defined = categoriesForVault(vault);
  const names = new Map(defined.map(category => [categoryKey(category.name), category.name]));
  const selected = [...new Set(entry.categories.map(categoryKey).filter(Boolean))]
    .map(key => names.get(key) ?? entry.categories.find(name => categoryKey(name) === key)!.trim());
  if (selected.some(name => name.length > 70)) throw new Error('Kategorienamen dürfen maximal 70 Zeichen haben.');
  const registry = [...defined];
  for (const name of selected) if (!names.has(categoryKey(name))) {
    registry.push(makeCategory(name));
    names.set(categoryKey(name), name);
  }
  const normalizedEntry = { ...entry, categories: selected };
  return { ...vault, categories: registry, entries: vault.entries.map(e => e.id === entry.id ? normalizedEntry : e) };
}
export function upsertCategory(vault: VaultData, next: VaultCategory, oldId?: string): VaultData {
  const registry = categoriesForVault(vault);
  const desired = next.name.trim();
  if (!desired || desired.length > 70) throw new Error('Ungültiger Kategoriename.');
  const duplicate = registry.some(item => categoryKey(item.name) === categoryKey(desired) && item.id !== oldId);
  if (duplicate) throw new Error('Eine Kategorie mit diesem Namen existiert bereits.');
  if (next.parentId) {
    const index = new Map(registry.map(category => [category.id, category]));
    const visited = new Set<string>();
    let cursor: string | undefined = next.parentId;
    const targetId = oldId ?? next.id;
    while (cursor) {
      if (cursor === targetId || visited.has(cursor)) throw new Error('Ordner darf nicht sein eigener Unterordner sein.');
      visited.add(cursor);
      const parent: VaultCategory | undefined = index.get(cursor);
      if (!parent) throw new Error('Übergeordneter Ordner nicht vorhanden.');
      cursor = parent.parentId;
    }
  }
  if (!oldId) return { ...vault, categories: [...registry, { ...next, name: desired }] };
  const original = registry.find(item => item.id === oldId);
  if (!original) throw new Error('Kategorie wurde nicht gefunden.');
  return {
    ...vault,
    categories: registry.map(item => item.id === oldId ? { ...next, id: oldId, name: desired } : item),
    entries: vault.entries.map(entry => ({
      ...entry,
      categories: entry.categories.map(name => categoryKey(name) === categoryKey(original.name) ? desired : name)
    }))
  };
}
export function removeCategory(vault: VaultData, id: string): VaultData {
  const registry = categoriesForVault(vault);
  const selected = registry.find(item => item.id === id);
  if (!selected) return vault;
  return {
    ...vault,
    categories: registry.filter(item => item.id !== id).map(item => item.parentId === id ? {...item, parentId:selected.parentId} : item),
    entries: vault.entries.map(entry => ({
      ...entry,
      categories: entry.categories.filter(name => categoryKey(name) !== categoryKey(selected.name))
    }))
  };
}

/** Includes all descendants of a selected category without altering assignments. */
export function categoryAndDescendants(categories: VaultCategory[], name: string): Set<string> {
  const index = new Map(categories.map(item => [item.id,item]));
  const selected = categories.find(category => categoryKey(category.name) === categoryKey(name));
  const result = new Set<string>([categoryKey(name)]);
  if (!selected) return result;
  const children = new Map<string,string[]>();
  for (const item of categories) {
    if (!item.parentId) continue;
    children.set(item.parentId,[...(children.get(item.parentId)??[]),item.id]);
  }
  const visited = new Set<string>();
  const queue = [selected.id];
  while(queue.length) {
    const id = queue.shift()!;
    if(visited.has(id)) continue;
    visited.add(id);
    const item = index.get(id);
    if(item) result.add(categoryKey(item.name));
    queue.push(...(children.get(id)??[]));
  }
  return result;
}
