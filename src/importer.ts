import { readSheet } from 'read-excel-file/browser';
import { blankEntry, makeField } from './types';
import type { FieldKind, VaultEntry } from './types';

// Parse RFC-4180 style CSV with BOM, escaped quotes, CRLF and multiline quoted values.
// Delimiters other than ',' are common for German Excel exports.
export function parseDelimited(text: string): string[][] {
  const csv = text.replace(/^\uFEFF/, '');
  const first = csv.slice(0, Math.min(csv.length, 10000)).split(/\r?\n/, 1)[0];
  const delimiter = [',', ';', '\t'].sort((a, b) => countOutsideQuotes(first, b) - countOutsideQuotes(first, a))[0];
  const rows: string[][] = [];
  let cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      cells.push(value); value = '';
    } else if ((c === '\r' || c === '\n') && !quoted) {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      cells.push(value);
      if (cells.some(cell => cell !== '')) rows.push(cells);
      cells = []; value = '';
    } else value += c;
  }
  if (quoted) throw new Error('CSV enthält ein nicht geschlossenes Anführungszeichen.');
  cells.push(value);
  if (cells.some(cell => cell !== '')) rows.push(cells);
  return rows;
}

function countOutsideQuotes(text: string, delimiter: string): number {
  let count = 0, quote = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      if (quote && text[i + 1] === '"') { i++; continue; }
      quote = !quote;
    } else if (!quote && text[i] === delimiter) count++;
  }
  return count;
}

const normalized = (value: string): string => value.toLowerCase().trim().replace(/[\s\-_./()]+/g, '');
const alias: Record<string, string> = {
  name:'title', title:'title', titel:'title', bezeichnung:'title', dienst:'title', service:'title',
  benutzername:'username', username:'username', login:'username', loginusername:'username',
  email:'email', emailaddress:'email', emailadresse:'email', mail:'email',
  passwort:'password', password:'password', loginpassword:'password', kennwort:'password',
  website:'website', url:'website', homepage:'website', loginuri:'website', origin:'website',
  notes:'notes', notiz:'notes', notizen:'notes', kommentar:'notes', kommentare:'notes',
  description:'description', beschreibung:'description',
  folder:'category', category:'category', kategorien:'category', kategorie:'category',
  collections:'category', person:'person', owner:'person', besitzer:'person',
  favorite:'favorite', favoriten:'favorite', favorit:'favorite',
  pin:'pin', adresse:'address', address:'address',
  created:'createdAt', createdat:'createdAt', erstellt:'createdAt',
  passwordchangedat:'passwordChangedAt', passwordupdatedat:'passwordChangedAt',
  passwordsetat:'passwordChangedAt'
};

function dateValue(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.now() ? timestamp : undefined;
}

function fieldKind(header: string): FieldKind {
  const h = normalized(header);
  if (h.includes('pin')) return 'pin';
  if (/pass|secret|token|recovery|key|code/.test(h)) return 'secret';
  if (/url|website|homepage|link/.test(h)) return 'url';
  if (/email|mail/.test(h)) return 'email';
  if (/note|comment|kommentar|beschreibung|address|adresse/.test(h)) return 'multiline';
  return 'text';
}

function normalizeCategories(value: string): string[] {
  return [...new Set(value.split(/[|;]/).map(part => part.trim()).filter(Boolean))];
}

export type ImportPreview = {
  entries: VaultEntry[];
  skipped: number;
  headers: string[];
  source: string;
};

export function rowsToVaultEntries(rows: (string | number | Date | boolean | null | undefined)[][], source: string): ImportPreview {
  if (rows.length < 2) throw new Error('Die Datei muss eine Kopfzeile und mindestens einen Eintrag enthalten.');
  if (rows.length > 1001) throw new Error('Maximal 1000 Zeilen pro Import. Datei bitte aufteilen.');
  const headers = rows[0].map(cell => String(cell ?? '').trim());
  if (headers.length > 100) throw new Error('Maximal 100 Spalten pro Import.');
  if (!headers.some(header => ['title', 'username', 'password', 'website', 'email'].includes(alias[normalized(header)] ?? ''))) {
    throw new Error('Keine bekannten Spalten gefunden. Erwartet: Name/Titel, Username, Password, URL oder E-Mail.');
  }
  const entries: VaultEntry[] = [];
  let skipped = 0;
  for (const raw of rows.slice(1)) {
    if (raw.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;
    const record = blankEntry();
    // Imported data is never logged or sent to any cloud service.
    record.fields = [];
    record.createdAt = Date.now();
    const extra: string[] = [];
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = raw[index];
      const value = cell instanceof Date ? cell.toISOString() : String(cell ?? '');
      if (!value) return;
      const known = alias[normalized(header)] ?? '';
      switch (known) {
        case 'title': record.title = value; break;
        case 'username': record.username = value; break;
        case 'email': record.email = value; break;
        case 'password': record.password = value; break;
        case 'website': record.website = value; break;
        case 'notes': record.notes = value; break;
        case 'description': record.description = value; break;
        case 'category': record.categories = normalizeCategories(value); break;
        case 'person': record.person = value; break;
        case 'favorite': record.favorite = ['1','true','ja','yes','y'].includes(normalized(value)); break;
        case 'pin': record.fields!.push(makeField('PIN', 'pin', value)); break;
        case 'address': record.fields!.push(makeField('Adresse', 'multiline', value)); break;
        case 'createdAt': record.createdAt = dateValue(value) ?? record.createdAt; break;
        case 'passwordChangedAt': record.passwordChangedAt = dateValue(value); break;
        default: {
          // Never silently discard unrecognized data; preserve it as an encrypted custom field.
          if (record.fields!.length >= 50) extra.push(header);
          else record.fields!.push(makeField(header, fieldKind(header), value));
        }
      }
    });
    record.title = record.title.trim() || record.website.trim() || record.email.trim() || record.username.trim();
    if (!record.title || extra.length) { skipped++; continue; }
    if (record.password && !record.passwordChangedAt) record.passwordChangedAt = record.createdAt;
    entries.push(record);
  }
  return { entries, skipped, headers, source };
}

export async function loadImportFile(file: File): Promise<ImportPreview> {
  if (file.size > 2_000_000) throw new Error('Importdatei zu groß (maximal 2 MB).');
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'csv') return rowsToVaultEntries(parseDelimited(await file.text()), file.name);
  if (ext === 'xlsx') {
    const rows = await readSheet(file);
    if (!Array.isArray(rows) || !rows.every(row => Array.isArray(row))) {
      throw new Error('Ungültige Excel-Tabellenstruktur.');
    }
    const safeRows = rows.map(row => row.map(cell => {
      if (cell === null || cell === undefined || typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean' || cell instanceof Date)
        return cell;
      return String(cell);
    }));
    return rowsToVaultEntries(safeRows, file.name);
  }
  throw new Error('Bitte eine CSV- oder XLSX-Datei auswählen. Alte .xls-Dateien zuerst in .xlsx konvertieren.');
}

export function skipDuplicates(existing: VaultEntry[], incoming: VaultEntry[]): { fresh: VaultEntry[]; duplicates: number } {
  const signatures = new Set(existing.map(signature));
  const fresh: VaultEntry[] = [];
  let duplicates = 0;
  for (const item of incoming) {
    const signatureValue = signature(item);
    if (signatures.has(signatureValue)) { duplicates++; continue; }
    signatures.add(signatureValue);
    fresh.push(item);
  }
  return { fresh, duplicates };
}

function signature(item: VaultEntry): string {
  return [item.title, item.username || item.email, item.website].map(part => part.trim().toLocaleLowerCase()).join('\u0000');
}
