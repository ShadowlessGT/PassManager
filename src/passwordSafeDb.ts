import { Capacitor, registerPlugin } from '@capacitor/core';
import { blankEntry, makeField } from './types';
import type { FieldKind, VaultEntry } from './types';

type SqlcipherTable = {
  name: string;
  columns: string[];
  rowCount?: number;
  rows: Record<string,string>[];
};

export type EncryptedPasswordSafeResult = {
  format: string;
  tables: SqlcipherTable[];
  readRows: number;
  omittedBinaryFields: number;
};

type NativePasswordSafeImporter = {
  pickAndImport(options: { password: string }): Promise<EncryptedPasswordSafeResult>;
};

const NativeImporter = registerPlugin<NativePasswordSafeImporter>('ParolaPasswordSafeDb');

export const nativePasswordSafeSupported = (): boolean => Capacitor.getPlatform() === 'android';

/**
 * Opens Android's system document picker, copies only the encrypted backup to
 * private app cache, and decrypts it using SQLCipher on-device. No Firebase,
 * remote services, or clipboard are involved. The master password is used
 * for this call only; never store it in IndexedDB or localStorage.
 */
export function openEncryptedPasswordSafe(password: string): Promise<EncryptedPasswordSafeResult> {
  if (!nativePasswordSafeSupported()) {
    throw new Error('Verschlüsselte Password-Safe-Datenbanken lassen sich derzeit direkt in der Android-App öffnen.');
  }
  if (!password || password.length > 4096) throw new Error('Bitte Master-Passwort der alten Datenbank eingeben.');
  return NativeImporter.pickAndImport({ password });
}

const normalized = (s: string) =>
  s.toLocaleLowerCase('de').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

const recognized: Record<string, keyof Pick<VaultEntry,
  'title'|'username'|'email'|'password'|'website'|'notes'|'description'|'person'>> = {
  title: 'title', name: 'title', titel: 'title', entryname: 'title', label: 'title', servicename: 'title',
  username: 'username', user: 'username', benutzername: 'username', login: 'username', loginname: 'username', accountname: 'username',
  mail: 'email', email: 'email', emailaddress: 'email',
  password: 'password', passwort: 'password', pwd: 'password', loginpassword: 'password',
  url: 'website', website: 'website', uri: 'website', homepage: 'website', addressurl: 'website',
  notes: 'notes', note: 'notes', notiz: 'notes', notizen: 'notes', kommentar: 'notes', comment: 'notes', comments: 'notes',
  description: 'description', beschreibung: 'description',
  person: 'person', owner: 'person'
};
const internalFields = new Set(['id','entryid','recordid','uuid','created','updated','lastmodified',
  'createdat','updatedat','version','deleted','deletedat','archived','synced','sortindex','position']);

function fieldKind(name: string): FieldKind {
  if (/\bpin\b/i.test(name)) return 'pin';
  if (/pass|secret|key|otp|code|token|recovery|kartennummer/i.test(name)) return 'secret';
  if (/url|website|uri|homepage/i.test(name)) return 'url';
  if (/email|mail/i.test(name)) return 'email';
  if (/note|comment|description|beschreibung|adresse/i.test(name)) return 'multiline';
  return 'text';
}

function parseDate(value: string): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  if (/^\d{10,13}$/.test(value)) {
    const ms = value.length === 10 ? number * 1000 : number;
    if (ms > 0 && ms <= Date.now() + 86_400_000) return ms;
  }
  const time = Date.parse(value);
  return Number.isFinite(time) && time > 0 && time <= Date.now() + 86_400_000 ? time : undefined;
}

export type PasswordSafeMapping = {
  entries: VaultEntry[];
  skippedRows: number;
  warnings: string[];
  sourceTables: string[];
  schema: Array<{ name: string; columns: string[]; rows: number }>;
  requiresPartialImportConfirmation: boolean;
};

/** Convert verified, decrypted SQLCipher rows into Parola's encrypted model.
 * Unknown columns are retained as custom fields. Unknown tables are reported
 * rather than silently presenting the conversion as complete.
 */
export function mapPasswordSafeDatabase(result: EncryptedPasswordSafeResult): PasswordSafeMapping {
  if (!result || result.format !== 'sqlcipher-v4' || !Array.isArray(result.tables)) {
    throw new Error('Nicht unterstütztes oder beschädigtes Datenbankformat.');
  }
  const entries: VaultEntry[] = [];
  const warnings: string[] = [];
  const sourceTables: string[] = [];
  let skippedRows = 0;

  for (const table of result.tables) {
    if (!table || typeof table.name !== 'string' || !Array.isArray(table.columns) ||
        !Array.isArray(table.rows)) throw new Error('Ungültige Tabellenstruktur.');
    if (!table.rows.length) continue;
    sourceTables.push(table.name);
    for (const row of table.rows) {
      if (Object.keys(row).length > 130) { skippedRows++; continue; }
      const entry = blankEntry();
      entry.fields = [];
      const assigned = new Set<string>();
      const now = Date.now();
      for (const [column, raw] of Object.entries(row)) {
        if (typeof raw !== 'string') continue;
        if (!raw || raw.length > 3_000_000) continue;
        const name = normalized(column);
        if (internalFields.has(name)) {
          if (name === 'createdat' || name === 'created') entry.createdAt = parseDate(raw) ?? entry.createdAt;
          if (name === 'updatedat' || name === 'updated') entry.updatedAt = parseDate(raw) ?? entry.updatedAt;
          continue;
        }
        if (raw.startsWith('data:image/') && entry.images.length < 3) {
          entry.images.push(raw);
          continue;
        }
        if (name === 'category' || name === 'categories' || name === 'folder') {
          const labels = raw.split(/[|;,]/).map(label => label.trim()).filter(label => Boolean(label && label.length <= 70));
          if (labels.length) entry.categories = [...new Set(labels)];
          continue;
        }
        if (name === 'favorite' || name === 'favourite' || name === 'isfavorite') {
          entry.favorite = ['1','true','yes','ja'].includes(normalized(raw)); continue;
        }
        const standard = recognized[name];
        if (standard && !assigned.has(standard)) {
          entry[standard] = raw;
          assigned.add(standard);
        } else if (entry.fields.length < 50) {
          entry.fields.push(makeField(column, fieldKind(column), raw));
        } else skippedRows++;
      }
      entry.title = entry.title.trim() || entry.website.trim() || entry.username.trim() || entry.email.trim();
      if (!entry.title) { skippedRows++; continue; }
      entry.updatedAt = Math.max(entry.updatedAt, entry.createdAt || now);
      entries.push(entry);
    }
  }

  if (result.omittedBinaryFields > 0) {
    warnings.push(result.omittedBinaryFields + ' große oder unbekannte Binärfelder wurden nicht übernommen.');
  }
  const unimportedTables = result.tables.filter(table =>
    table.rows.length === 0 && (table.rowCount ?? 0) > 0 &&
    !/^(?:sqlite_|android_metadata|room_master_table|database_info|settings|preferences|metadata|version)$/i.test(table.name));
  if (unimportedTables.length > 0) {
    warnings.push('Nicht automatisch zugeordnete Datenbanktabellen: ' +
      unimportedTables.map(table => table.name + ' (' + table.rowCount + ' Datensätze)').slice(0, 10).join(', ') +
      '. Diese können Anhänge, Kategorien, Passkeys oder 2FA-Daten enthalten.');
  }
  if (skippedRows) warnings.push(skippedRows + ' Datenfelder oder Zeilen konnten nicht zugeordnet werden.');
  if (!entries.length) {
    const schema = result.tables.map(table => table.name + ' (' + table.columns.join(', ') + ')').slice(0, 25).join('; ');
    throw new Error('Datenbank wurde entschlüsselt, aber das Tabellenformat ist noch unbekannt. Tabellenstruktur: ' + schema);
  }
  return {
    entries,
    skippedRows,
    warnings,
    sourceTables,
    schema: result.tables.map(table => ({ name: table.name, columns: table.columns, rows: table.rowCount ?? table.rows.length })),
    requiresPartialImportConfirmation: warnings.length > 0
  };
}
