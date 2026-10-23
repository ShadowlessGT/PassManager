import type { VaultCategory, VaultData, VaultEntry } from './types';

export const CATEGORY_COLORS = ['#927BF5','#3DADAC','#E9A65D','#E0718C','#7599E8','#94AB63','#A1A8BB'] as const;
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
    color: CATEGORY_COLORS.includes(color as typeof CATEGORY_COLORS[number]) ? color : CATEGORY_COLORS[0]
  };
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
    categories: registry.filter(item => item.id !== id),
    entries: vault.entries.map(entry => ({
      ...entry,
      categories: entry.categories.filter(name => categoryKey(name) !== categoryKey(selected.name))
    }))
  };
}
