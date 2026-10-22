import type { ActivityKind, EntryActivity, VaultData, VaultEntry } from './types';

export type RankedItem = { name: string; count: number };
export type SecuritySummary = {
  unique: number;
  reused: number;
  weak: number;
  withoutPassword: number;
  reusedGroups: { entryIds: string[]; count: number }[];
};
export type VaultInsights = {
  total: number;
  categories: RankedItem[];
  fieldTypes: RankedItem[];
  copiedFields: RankedItem[];
  mostOpened: RankedItem[];
  mostCopied: RankedItem[];
  people: number;
  activity: { opens: number; copies: number; reveals: number };
  security: SecuritySummary;
};

export const initialActivity = (): EntryActivity => ({ opens: 0, copies: 0, reveals: 0, fieldCopies: {} });

export function logActivity(entry: VaultEntry, kind: ActivityKind, fieldType?: string, now = Date.now()): VaultEntry {
  const activity: EntryActivity = { ...initialActivity(), ...(entry.activity ?? {}), fieldCopies: { ...(entry.activity?.fieldCopies ?? {}) } };
  if (kind === 'open') {
    activity.opens++;
    activity.lastOpenedAt = now;
  }
  if (kind === 'copy') {
    activity.copies++;
    if (fieldType) activity.fieldCopies[fieldType] = (activity.fieldCopies[fieldType] ?? 0) + 1;
  }
  if (kind === 'reveal') activity.reveals++;
  activity.lastUsedAt = now;
  return { ...entry, activity };
}

export function trackPasswordHistory(previous: VaultEntry | undefined, current: VaultEntry): VaultEntry {
  if (!previous || previous.password === current.password || !previous.password) {
    return { ...current, passwordHistory: current.passwordHistory ?? previous?.passwordHistory ?? [] };
  }
  const existing = current.passwordHistory ?? previous.passwordHistory ?? [];
  const now = Date.now();
  return {
    ...current,
    passwordChangedAt: current.passwordChangedAt ?? now,
    passwordHistory: [...existing, { value: previous.password, replacedAt: now }].slice(-10)
  };
}

export function passwordStrength(secret: string): 'missing' | 'weak' | 'fair' | 'strong' {
  if (!secret) return 'missing';
  if (secret.length < 12 || /^([0-9]+|[a-z]+|[A-Z]+)$/u.test(secret) ||
      /(password|passwort|qwerty|123456|letmein|admin)/iu.test(secret)) return 'weak';
  const sets = [/[a-z]/u, /[A-Z]/u, /\d/u, /[^a-zA-Z0-9]/u].filter(exp => exp.test(secret)).length;
  if (secret.length >= 16 && sets >= 3) return 'strong';
  return 'fair';
}

function ranking(counts: Map<string, number>): RankedItem[] {
  return [...counts].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de'));
}
function count(map: Map<string, number>, key: string, increment = 1) {
  map.set(key, (map.get(key) ?? 0) + increment);
}

// All analysis runs in device memory AFTER decrypting. Results are never uploaded,
// and no plaintext password is included in the resulting statistical snapshot.
export function calculateInsights(vault: VaultData): VaultInsights {
  const entries = vault.entries;
  const categories = new Map<string, number>();
  const fieldTypes = new Map<string, number>();
  const copiedFields = new Map<string, number>();
  const passwords = new Map<string, string[]>();
  const mostOpened = new Map<string, number>();
  const mostCopied = new Map<string, number>();
  let unique = 0, weak = 0, missing = 0, opens = 0, copies = 0, reveals = 0;

  for (const entry of entries) {
    entry.categories.forEach(category => count(categories, category));
    for (const name of ['Benutzername','E-Mail','Passwort','Homepage','Notizen'] as const) {
      const value = ({ Benutzername: entry.username, 'E-Mail': entry.email,
        Passwort: entry.password, Homepage: entry.website, Notizen: entry.notes })[name];
      if (value) count(fieldTypes, name);
    }
    for (const field of entry.fields ?? []) if (field.value) count(fieldTypes,
      ({ text:'Freitext', secret:'Geheimfeld', pin:'PIN', multiline:'Mehrzeilig', url:'Link',
         email:'E-Mail (extra)', number:'Zahl' })[field.kind] ?? 'Sonstige');

    if (!entry.password) missing++;
    else {
      const strength = passwordStrength(entry.password);
      if (strength === 'weak') weak++;
      const list = passwords.get(entry.password) ?? [];
      list.push(entry.id);
      passwords.set(entry.password, list);
    }
    const activity = entry.activity;
    if (activity) {
      opens += activity.opens || 0;
      copies += activity.copies || 0;
      reveals += activity.reveals || 0;
      if (activity.opens) count(mostOpened, entry.title || 'Unbenannt', activity.opens);
      if (activity.copies) count(mostCopied, entry.title || 'Unbenannt', activity.copies);
      for (const [name, amount] of Object.entries(activity.fieldCopies ?? {})) count(copiedFields, name, amount);
    }
  }
  const reusedGroups = [...passwords.values()].filter(ids => ids.length > 1).map(ids => ({ entryIds: ids, count: ids.length }))
    .sort((a, b) => b.count - a.count);
  unique = passwords.size;
  const reused = reusedGroups.reduce((sum, group) => sum + group.count, 0);

  return {
    total: entries.length, categories: ranking(categories), fieldTypes: ranking(fieldTypes),
    copiedFields: ranking(copiedFields), mostOpened: ranking(mostOpened),
    mostCopied: ranking(mostCopied), people: new Set(entries.map(e => e.person).filter(Boolean)).size,
    activity: { opens, copies, reveals },
    security: { unique, reused, weak, withoutPassword: missing, reusedGroups }
  };
}
