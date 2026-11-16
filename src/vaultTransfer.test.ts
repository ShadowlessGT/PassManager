import { describe, expect, it } from 'vitest';
import { blankEntry, newVault, makeField } from './types';
import { parseDelimited, rowsToVaultEntries } from './importer';
import { exportEncryptedBackup, exportVaultCsv, parseEncryptedBackup, validateImportedVault } from './vaultTransfer';
import { deriveVaultKey, encryptVault, newSalt, decryptVault } from './crypto';

describe('Password Safe migration and Parola export', () => {
  it('preserves German Password Safe repeated password, PIN, notes and custom field columns', () => {
    const header = [
      'Titel', 'Kategorie', 'Benutzername', 'Passwort', 'Webseite', 'Kommentar',
      'Mitgliedsnummer', 'DiBa Key', 'ImmaNR.', 'Wiederherstellungscode',
      'Kundennummer', 'E-Mail', 'Steuernummer', 'Identifikationnummer',
      'Kartennummer', 'PIN', 'Vertraganummer', 'Iban', 'Kundenzahl',
      'Kontonummer', 'Kommentar', 'Passwort', 'Passwort', 'Iban',
      'Kartennummer', 'Kommentar', 'PIN', 'PIN', 'Benutzername',
      'Identifikationnummer', 'Identifikationnummer'
    ];
    const row = header.map((_, i) => 'demo-' + i);
    row[0] = 'Online-Beispiel';
    row[1] = 'Finanzen';
    row[2] = 'demo';
    row[3] = 'primary-secret';
    row[4] = 'https://example.invalid';
    const sourceCsv = '\uFEFF' + header.map(v => '"' + v + '"').join(';') + '\r\n' + row.map(v => '"' + v + '"').join(';') + '\r\n';
    const result = rowsToVaultEntries(parseDelimited(sourceCsv), 'demo.csv');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].password).toBe('primary-secret');
    expect(result.entries[0].username).toBe('demo');
    expect(result.entries[0].notes).toBe('demo-5');
    expect(result.entries[0].fields?.filter(f => f.label === 'Passwort').map(f => f.value)).toEqual(['demo-21','demo-22']);
    expect(result.entries[0].fields?.filter(f => f.label === 'PIN').map(f => f.value)).toEqual(['demo-15','demo-26','demo-27']);
    expect(result.entries[0].fields?.filter(f => f.label === 'Kommentar').map(f => f.value)).toEqual(['demo-20','demo-25']);
    expect(result.entries[0].fields?.find(f => f.label === 'Wiederherstellungscode')?.kind).toBe('secret');
    expect(result.entries[0].fields?.find(f => f.label === 'Kartennummer')?.kind).toBe('secret');
  });

  it('exports CSV with repeated custom labels and escaped multiline values, then imports without data loss', () => {
    const entry = blankEntry();
    entry.title = 'Fake; "Demo"';
    entry.username = 'demo';
    entry.password = 'primary-password';
    entry.notes = 'line1\nline2';
    entry.website = 'https://example.invalid';
    entry.categories = ['Finanzen', 'Wichtig'];
    entry.fields = [
      makeField('PIN', 'pin', '9999'),
      makeField('Passwort', 'secret', 'secondary-password'),
      makeField('Passwort', 'secret', 'third-password'),
      makeField('Kommentar', 'multiline', 'extra note; with "quotes"')
    ];
    const csv = exportVaultCsv({ ...newVault(), entries: [entry] });
    expect(csv[0]).toBe('\uFEFF');
    const result = rowsToVaultEntries(parseDelimited(csv), 'export.csv');
    expect(result.entries).toHaveLength(1);
    const restored = result.entries[0];
    expect(restored.title).toBe(entry.title);
    expect(restored.password).toBe(entry.password);
    expect(restored.notes).toBe(entry.notes);
    expect(restored.categories).toEqual(entry.categories);
    expect(restored.fields?.filter(f => f.label === 'Passwort').map(f => f.value))
      .toEqual(['secondary-password','third-password']);
    expect(restored.fields?.find(f => f.label === 'Kommentar')?.value).toBe('extra note; with "quotes"');
  });

  it('protects spreadsheet viewers from formula injection in exported CSV', () => {
    const e = blankEntry();
    e.title = '=HYPERLINK("https://example.invalid","test")';
    e.password = '+1+2';
    const csv = exportVaultCsv({ ...newVault(), entries: [e] });
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+1+2");
  });

  it('keeps per-entry icons and up to 12 imported pictures in encrypted backup format', async () => {
    const entry = { ...blankEntry(), title: 'Synthetic account', icon: 'house',
      images: Array.from({ length: 12 }, () => 'data:image/png;base64,AA==') };
    const vault = { ...newVault(), entries: [entry] };
    expect(validateImportedVault(vault).entries[0].icon).toBe('house');
    const salt = newSalt();
    const key = await deriveVaultKey('synthetic master password only for tests', salt);
    const envelope = await encryptVault(vault, key, salt);
    const imported = validateImportedVault(await decryptVault(parseEncryptedBackup(
      exportEncryptedBackup(envelope)), key));
    expect(imported.entries[0].icon).toBe('house');
    expect(imported.entries[0].images).toHaveLength(12);
    expect(() => validateImportedVault({ ...vault, entries: [
      { ...entry, icon: 'x'.repeat(65) }
    ] })).toThrow(/ungültige|große/);
  });

  it('backs up only encrypted ciphertext and round-trips with its master key', async () => {
    const vault = newVault();
    const e = blankEntry();
    e.title = 'Demo';
    e.password = 'sensitive-sample';
    vault.entries.push(e);
    const salt = newSalt();
    const key = await deriveVaultKey('synthetic strong master password for test',salt);
    const enc = await encryptVault(vault,key,salt);
    const backup = exportEncryptedBackup(enc);
    expect(backup).not.toContain('sensitive-sample');
    const parsed = parseEncryptedBackup(backup);
    const decrypted = await decryptVault(parsed,key);
    expect(decrypted.entries[0].password).toBe('sensitive-sample');
    expect(() => parseEncryptedBackup('{"version":1,"entries":[]}')).toThrow(/kein verschlüsseltes/i);
    expect(() => parseEncryptedBackup('invalid')).toThrow(/JSON/);
  });
});
