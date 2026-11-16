import { blankEntry, makeField } from './types';
import type { FieldKind, VaultEntry } from './types';

/** Password Safe Android relational SQLite mapping; never uses a network service. */
export type PasswordSafeRelationalResult = {
  format: 'passwordsafe-relational-v1';
  sqlcipherFormat: string;
  session: string;
  entries: Array<{
    sourceId: string;
    title: string;
    createdAt: string;
    modifiedAt: string;
    favorite: boolean;
    archived: boolean;
    iconIdentifier: string;
    fields: Array<{
      label: string;
      standardKey: string;
      isPassword: boolean;
      isWebsite: boolean;
      value: string;
    }>;
    categories: string[];
    images: Array<{ id: string; byteLength: number }>;
    history: Array<{ value: string; timestamp: string; label: string; standardKey: string; isPassword: boolean }>;
  }>;
  imageCount: number;
  totalImageBytes: number;
  sourceIconCount: number;
  categoryCount: number;
  historyCount: number;
  sourceCategories: Array<{ name: string; color: string }>;
  unsupported: Record<string, number>;
  readRows: number;
};

export type RelationalImportMapping = {
  entries: VaultEntry[];
  skippedRows: number;
  warnings: string[];
  sourceTables: string[];
  schema: Array<{ name: string; columns: string[]; rows: number }>;
  requiresPartialImportConfirmation: boolean;
  sourceSession: string;
  imageRefsByEntryId: Record<string, string[]>;
  imageCount: number;
  sourceIconCount: number;
  sourceCategoryCount: number;
  sourceHistoryCount: number;
  sourceCategories: Array<{ name: string; color: string }>;
};

function normalized(text: string): string {
  return text.toLocaleLowerCase('de').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

const standardFieldNames: Record<string, keyof Pick<VaultEntry,
 'username' | 'password' | 'website' | 'notes' | 'email' | 'description'>> = {
  username: 'username', benutzername: 'username', login: 'username',
  password: 'password', passwort: 'password',
  website: 'website', webseite: 'website', url: 'website', homepage: 'website',
  notes: 'notes', kommentar: 'notes', notizen: 'notes', note: 'notes',
  email: 'email', mail: 'email',
  description: 'description', beschreibung: 'description'
};

function kindFor(label: string, password: boolean, website: boolean): FieldKind {
  const key = normalized(label);
  if (key === 'pin') return 'pin';
  if (password || /(passwort|password|geheim|secret|wiederherstellung|recovery|key|token|code)/.test(key)) return 'secret';
  if (website || /(web|url|homepage)/.test(key)) return 'url';
  if (/(email|mail)/.test(key)) return 'email';
  if (/(kommentar|note|beschreibung|adresse)/.test(key)) return 'multiline';
  return 'text';
}

function sourceTimestamp(value: string): number | undefined {
  if (!value) return undefined;
  let millis: number;
  if (/^\d{13}$/.test(value)) millis = Number(value);
  else if (/^\d{10}$/.test(value)) millis = Number(value) * 1000;
  else millis = Date.parse(value.includes(' ') && !value.includes('T') ?
    value.replace(' ', 'T') : value);
  return Number.isFinite(millis) && millis > 0 && millis <= Date.now() + 86_400_000
    ? millis : undefined;
}

export function mapPasswordSafeRelational(source: PasswordSafeRelationalResult): RelationalImportMapping {
  if (!source || source.format !== 'passwordsafe-relational-v1' ||
      typeof source.session !== 'string' || !source.session ||
      !Array.isArray(source.entries) || source.entries.length > 1500) {
    throw new Error('Die Password-Safe-Importdaten sind ungültig.');
  }
  if (source.entries.length !== source.readRows) {
    throw new Error('Einträge fehlen in den entschlüsselten Quelldaten; Import abgebrochen.');
  }
  const entries: VaultEntry[] = [];
  const imageRefsByEntryId: Record<string, string[]> = {};
  const warnings: string[] = [];
  const seenSourceIds = new Set<string>();
  let countedImages = 0;
  let countedIcons = 0;
  let countedHistory = 0;
  for (const raw of source.entries) {
    if (!raw || typeof raw.sourceId !== 'string' || seenSourceIds.has(raw.sourceId) ||
        !Array.isArray(raw.fields) || !Array.isArray(raw.categories) ||
        !Array.isArray(raw.images) || !Array.isArray(raw.history) ||
        typeof raw.title !== 'string' || raw.fields.length > 50 ||
        raw.images.length > 1000 || raw.history.length > 50) {
      throw new Error('Password-Safe-Einträge oder ihre Beziehungen sind unvollständig.');
    }
    seenSourceIds.add(raw.sourceId);
    const entry = blankEntry();
    entry.title = raw.title.trim();
    if (!entry.title) throw new Error('Ein Quelleintrag hat keinen Namen; Import abgebrochen.');
    entry.favorite = raw.favorite === true;
    if (typeof raw.iconIdentifier !== 'string' ||
        (raw.iconIdentifier.length > 0 && !/^[a-z0-9_-]{1,64}$/i.test(raw.iconIdentifier))) {
      throw new Error('Ungültige Icon-Zuordnung in der Quelle.');
    }
    if (raw.iconIdentifier) {
      entry.icon = raw.iconIdentifier.toLowerCase();
      countedIcons++;
    }
    if (raw.archived) entry.lifecycle = { state: 'archived', changedAt: Date.now() };
    entry.createdAt = sourceTimestamp(raw.createdAt) ?? entry.createdAt;
    entry.updatedAt = sourceTimestamp(raw.modifiedAt) ?? entry.updatedAt;
    entry.categories = [...new Set(raw.categories
      .filter((label): label is string => typeof label === 'string' && label.trim().length > 0 && label.length <= 70)
      .map(label => label.trim()))];
    entry.fields = [];
    const assigned = new Set<string>();
    for (const field of raw.fields) {
      if (!field || typeof field.label !== 'string' || typeof field.value !== 'string' ||
          field.value.length > 100_000 || field.label.length > 100) {
        throw new Error('Ein Quellfeld kann nicht verlustfrei übernommen werden.');
      }
      if (!field.value) continue;
      const key = normalized(field.standardKey || field.label);
      const primary = field.isWebsite ? 'website' : standardFieldNames[key];
      if (primary && !assigned.has(primary)) {
        entry[primary] = field.value;
        assigned.add(primary);
      } else if (entry.fields.length < 50) {
        entry.fields.push(makeField(field.label, kindFor(field.label, field.isPassword, field.isWebsite), field.value));
      } else {
        throw new Error('Mehr als 50 individuelle Felder; Import abgebrochen, damit nichts verloren geht.');
      }
    }
    const imageIds: string[] = [];
    for (const image of raw.images) {
      if (!image || typeof image.id !== 'string' || !/^\d{1,18}$/.test(image.id) ||
          !Number.isSafeInteger(image.byteLength) || image.byteLength <= 0 ||
          image.byteLength > 5_000_000) {
        throw new Error('Ein Quellbild ist ungültig oder zu groß.');
      }
      if (imageIds.includes(image.id)) throw new Error('Doppelte Bildreferenz in der Quelle.');
      imageIds.push(image.id);
    }
    imageRefsByEntryId[entry.id] = imageIds;
    countedImages += imageIds.length;
    const passwordHistory: NonNullable<VaultEntry['passwordHistory']> = [];
    for (const item of raw.history) {
      if (!item || typeof item.value !== 'string' || item.value.length > 100_000 ||
          typeof item.label !== 'string' || typeof item.standardKey !== 'string') {
        throw new Error('Passworthistorie beschädigt; Import abgebrochen.');
      }
      const timestamp = sourceTimestamp(item.timestamp) ?? entry.updatedAt;
      if (normalized(item.standardKey) === 'password' || normalized(item.label) === 'passwort') {
        passwordHistory.push({ value: item.value, replacedAt: timestamp });
      } else {
        // Historic values for custom secrets must not masquerade as an old main password.
        // Keep these values as encrypted custom fields with their original label and date.
        if (entry.fields.length >= 50) {
          throw new Error('Historische Geheimfelder überschreiten das Feldlimit; Import abgebrochen.');
        }
        const label = 'Historie: ' + item.label + ' (' + new Date(timestamp).toISOString().slice(0, 10) + ')';
        entry.fields.push(makeField(label, 'secret', item.value));
      }
    }
    entry.passwordHistory = passwordHistory.reverse();
    if (passwordHistory.length) entry.keepPasswordHistory = true;
    countedHistory += raw.history.length;
    entries.push(entry);
  }
  if (countedIcons !== source.sourceIconCount) {
    throw new Error('Nicht alle Eintragssymbole wurden erkannt. Import abgebrochen.');
  }
  if (countedImages !== source.imageCount) {
    throw new Error('Nicht alle Quellbilder wurden erkannt. Import vor dem Speichern abgebrochen.');
  }
  if (countedHistory !== source.historyCount) {
    throw new Error('Die Quell-Passworthistorie ist nicht vollständig. Import abgebrochen.');
  }
  for (const [name, count] of Object.entries(source.unsupported ?? {})) {
    if (Number.isInteger(count) && count > 0) {
      warnings.push(String(count) + ' Datensätze aus ' + name +
        ' können derzeit nicht vollständig übernommen werden.');
    }
  }
  return {
    entries, skippedRows: 0, warnings,
    sourceTables: ['Passwords','PasswordEntryElement','PwEntryElementContent','Categories',
      'PwCatRelations','Images','PasswordHistory'],
    schema: [],
    requiresPartialImportConfirmation: warnings.length > 0,
    sourceSession: source.session,
    imageRefsByEntryId,
    imageCount: source.imageCount,
    sourceIconCount: source.sourceIconCount,
    sourceCategoryCount: source.categoryCount,
    sourceHistoryCount: source.historyCount,
    sourceCategories: (source.sourceCategories ?? []).filter(item =>
      item && typeof item.name === 'string' && item.name.length <= 70 &&
      typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color))
  };
}
