import type { EncryptedEnvelope } from './crypto';
import type { VaultData, VaultEntry } from './types';

export const PAROLA_BACKUP_FORMAT = 'parola-encrypted-v1';

const MAIN_HEADERS = [
  'Titel', 'Kategorie', 'Benutzername', 'Passwort', 'Webseite',
  'E-Mail', 'Kommentar', 'Beschreibung', 'Person', 'Favorit',
  'Erstellt', 'Passwort geändert am'
] as const;

function csvCell(input: string): string {
  // Unencrypted CSV is explicitly offered for migration only. Protect anyone
  // who later opens it with Excel/Sheets from interpreting data as formulas.
  const safe = /^[\s\t\r\n]*[=+@-]/.test(input) ? "'" + input : input;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function csvRow(values: string[]): string {
  return values.map(csvCell).join(';');
}

const keyFor = (label: string, occurrence: number) => label + '\u0000' + occurrence;

export function exportVaultCsv(vault: VaultData): string {
  const customColumns: Array<{ label: string; occurrence: number }> = [];
  const maximum = new Map<string, number>();
  for (const entry of vault.entries) {
    const seen = new Map<string, number>();
    for (const field of entry.fields ?? []) {
      const label = field.label || 'Zusatzfeld';
      const number = (seen.get(label) ?? 0) + 1;
      seen.set(label, number);
      if (number > (maximum.get(label) ?? 0)) {
        maximum.set(label, number);
        customColumns.push({ label, occurrence: number });
      }
    }
  }
  if (MAIN_HEADERS.length + customColumns.length > 100) {
    throw new Error('Zu viele verschiedene Zusatzfeld-Spalten für CSV. Verwende das verschlüsselte Parola-Backup.');
  }
  const rows: string[] = [csvRow([...MAIN_HEADERS, ...customColumns.map(col => col.label)])];
  for (const entry of vault.entries) {
    const fields = new Map<string, string>();
    const seen = new Map<string, number>();
    for (const field of entry.fields ?? []) {
      const label = field.label || 'Zusatzfeld';
      const number = (seen.get(label) ?? 0) + 1;
      seen.set(label, number);
      fields.set(keyFor(label, number), field.value);
    }
    const row = [
      entry.title, entry.categories.join('|'), entry.username, entry.password,
      entry.website, entry.email, entry.notes, entry.description, entry.person,
      entry.favorite ? 'ja' : 'nein',
      new Date(entry.createdAt).toISOString(),
      entry.passwordChangedAt ? new Date(entry.passwordChangedAt).toISOString() : ''
    ];
    rows.push(csvRow([...row, ...customColumns.map(col => fields.get(keyFor(col.label, col.occurrence)) ?? '')]));
  }
  // UTF-8 BOM is necessary for spreadsheet tools expecting Windows CSV.
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}

function validateEnvelope(input: unknown): EncryptedEnvelope {
  if (!input || typeof input !== 'object') throw new Error('Kein gültiger verschlüsselter Parola-Tresor.');
  const value = input as Record<string, unknown>;
  if (value.v !== 1 || value.iterations !== 600_000 ||
      typeof value.salt !== 'string' || typeof value.nonce !== 'string' ||
      typeof value.ciphertext !== 'string' || typeof value.updatedAt !== 'number' ||
      value.salt.length > 1024 || value.nonce.length > 1024 ||
      value.ciphertext.length < 16 || value.ciphertext.length > 65_000_000) {
    throw new Error('Unbekanntes oder beschädigtes Parola-Backup.');
  }
  return value as EncryptedEnvelope;
}

export function exportEncryptedBackup(envelope: EncryptedEnvelope): string {
  return JSON.stringify({
    format: PAROLA_BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    vault: validateEnvelope(envelope)
  });
}

export function parseEncryptedBackup(text: string): EncryptedEnvelope {
  if (text.length > 70_000_000) throw new Error('Backup überschreitet die erlaubte Größe.');
  let json: unknown;
  try { json = JSON.parse(text); }
  catch { throw new Error('Keine gültige Parola-Backupdatei (JSON).'); }
  if (!json || typeof json !== 'object' ||
    (json as Record<string, unknown>).format !== PAROLA_BACKUP_FORMAT) {
    throw new Error('Dies ist kein verschlüsseltes Parola-Backup.');
  }
  return validateEnvelope((json as Record<string, unknown>).vault);
}

export function newBackupFilename(extension: 'parola' | 'csv', date = new Date()): string {
  return 'Parola-' + date.toISOString().slice(0, 10) + '.' + extension;
}

/** Parse decrypted backup content strictly before merging into an existing vault.
 * Never render or store objects with malformed field/category types.
 */
export function validateImportedVault(vault: VaultData): VaultData {
  if (!vault || vault.version !== 1 || !Array.isArray(vault.entries) || vault.entries.length > 10_000 ||
      (vault.categories !== undefined && !Array.isArray(vault.categories))) {
    throw new Error('Unbekanntes oder ungültiges Tresorformat.');
  }
  const strings = ['id','title','username','email','password','website','description','notes','person'] as const;
  for (const entry of vault.entries) {
    if (!entry || strings.some(field => typeof entry[field] !== 'string' ||
      entry[field].length > 100_000) || !Array.isArray(entry.categories) ||
      !entry.categories.every(category => typeof category === 'string' && category.length <= 70) ||
      !Array.isArray(entry.images) || entry.images.length > 3 ||
      !entry.images.every(image => typeof image === 'string' && image.startsWith('data:image/') &&
        image.length <= 5_000_000) ||
      (entry.fields !== undefined && (!Array.isArray(entry.fields) || entry.fields.length > 50 ||
        !entry.fields.every(field => field && typeof field.label === 'string' &&
          field.label.length > 0 && field.label.length <= 100 &&
          ['text','secret','pin','multiline','url','email','number'].includes(field.kind) &&
          typeof field.value === 'string' && field.value.length <= 100_000))) ||
      typeof entry.createdAt !== 'number' || !Number.isFinite(entry.createdAt) ||
      typeof entry.updatedAt !== 'number' || !Number.isFinite(entry.updatedAt) ||
      typeof entry.favorite !== 'boolean') {
      throw new Error('Das verschlüsselte Backup enthält ungültige oder zu große Einträge.');
    }
  }
  for (const category of vault.categories ?? []) {
    if (!category || typeof category.name !== 'string' ||
        category.name.trim().length === 0 || category.name.length > 70 ||
        typeof category.id !== 'string' || typeof category.color !== 'string' ||
        typeof category.icon !== 'string') {
      throw new Error('Die Sicherung enthält ungültige Kategorien.');
    }
  }
  return vault;
}

export function countSensitiveFields(entries: VaultEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.password ? 1 : 0) +
    (entry.fields ?? []).filter(field => ['secret', 'pin'].includes(field.kind) && Boolean(field.value)).length, 0);
}
