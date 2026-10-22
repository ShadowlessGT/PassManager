export type FieldKind = 'text' | 'secret' | 'pin' | 'multiline' | 'url' | 'email' | 'number';

export type EntryField = {
  id: string;
  label: string;
  kind: FieldKind;
  value: string;
  createdAt: number;
  updatedAt: number;
};

export type ActivityKind = 'open' | 'copy' | 'reveal';
export type EntryActivity = {
  opens: number;
  copies: number;
  reveals: number;
  lastOpenedAt?: number;
  lastUsedAt?: number;
  fieldCopies: Record<string, number>;
};
export type SecretHistoryItem = {
  value: string;
  replacedAt: number;
};
export type VaultEntry = {
  id: string;
  title: string;
  username: string;
  email: string;
  password: string;
  website: string;
  description: string;
  notes: string;
  categories: string[];
  person: string;
  images: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  // Optional for compatibility with already encrypted vaults created in v0.1.
  passwordChangedAt?: number;
  fields?: EntryField[];
  activity?: EntryActivity;
  // Old passwords stay encrypted within the vault. Max 10 retained per entry.
  passwordHistory?: SecretHistoryItem[];
  keepPasswordHistory?: boolean;
};

export type VaultData = { version: 1; entries: VaultEntry[] };
export const newVault = (): VaultData => ({ version: 1, entries: [] });

export const makeField = (label: string, kind: FieldKind = 'text', value = ''): EntryField => ({
  id: crypto.randomUUID(),
  label,
  kind,
  value,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export const ENTRY_FIELD_PRESETS: { label: string; kind: FieldKind }[] = [
  { label: 'PIN', kind: 'pin' },
  { label: 'Adresse', kind: 'multiline' },
  { label: 'Nickname', kind: 'text' },
  { label: 'Telefon', kind: 'text' },
  { label: 'Wiederherstellungscode', kind: 'secret' },
  { label: 'Kundennummer', kind: 'text' },
  { label: 'Benutzername', kind: 'text' },
  { label: 'Passwort', kind: 'secret' },
  { label: 'E-Mail', kind: 'email' },
  { label: 'Homepage', kind: 'url' }
];

export const FIELD_KINDS: { value: FieldKind; label: string }[] = [
  { value: 'text', label: 'Text (einzeilig)' },
  { value: 'secret', label: 'Geheim / Passwort' },
  { value: 'pin', label: 'PIN (nur Zahlen)' },
  { value: 'multiline', label: 'Text (mehrzeilig)' },
  { value: 'url', label: 'Anklickbarer Link' },
  { value: 'email', label: 'E-Mail-Adresse' },
  { value: 'number', label: 'Zahl' }
];

export function validateEntryFields(fields: EntryField[]): string | null {
  if (fields.length > 50) return 'Maximal 50 zusätzliche Felder pro Eintrag.';
  for (const field of fields) {
    if (!field.label.trim()) return 'Jedes Zusatzfeld benötigt einen Namen.';
    if (field.label.length > 100) return 'Feldnamen dürfen maximal 100 Zeichen enthalten.';
    if (field.kind === 'pin' && field.value !== '' && !/^[0-9]+$/.test(field.value))
      return 'PIN-Felder dürfen nur die Ziffern 0–9 enthalten.';
    if (field.kind === 'number' && field.value !== '' && !/^-?[0-9]+([.,][0-9]+)?$/.test(field.value))
      return 'Zahlenfelder dürfen nur Zahlen enthalten.';
    if (field.value.length > 100_000) return 'Ein Zusatzfeld ist zu lang.';
  }
  return null;
}

export const blankEntry = (): VaultEntry => ({
  id: crypto.randomUUID(),
  title: '',
  username: '',
  email: '',
  password: '',
  website: '',
  description: '',
  notes: '',
  categories: [],
  person: '',
  images: [],
  favorite: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  fields: [makeField('PIN', 'pin'), makeField('Adresse', 'multiline')]
});
