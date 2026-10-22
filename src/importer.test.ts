import { describe, expect, it } from 'vitest';
import { parseDelimited, rowsToVaultEntries, skipDuplicates } from './importer';

describe('CSV & Excel mapping', () => {
  it('handles BOM, CRLF, quoted delimiters, quotes and multiline fields', () => {
    const text = '\uFEFFName;Benutzername;Passwort;Notizen\r\n"Bank; Privat";tamer;1234;"first\nsecond ""quoted"""\r\n';
    const rows = parseDelimited(text);
    expect(rows[0]).toEqual(['Name','Benutzername','Passwort','Notizen']);
    expect(rows[1]).toEqual(['Bank; Privat', 'tamer','1234','first\nsecond "quoted"']);
  });
  it('imports standard and unknown custom columns, with PIN typed correctly', () => {
    const rows = [
      ['name','login_username','login_password','login_uri','pin','Recovery Token','folder'],
      ['Bank','user','pw','https://bank.example','1234','SECRET-TEST','Finanzen']
    ];
    const imported = rowsToVaultEntries(rows, 'bank.csv');
    expect(imported.entries[0].password).toBe('pw');
    expect(imported.entries[0].fields?.map(field => field.kind)).toEqual(['pin','secret']);
    expect(imported.entries[0].categories).toEqual(['Finanzen']);
  });
  it('skips existing entries, without dropping distinct accounts', () => {
    const rows = [['name','username','password'],['example','one','a'],['example','two','b']];
    const result = rowsToVaultEntries(rows, 'e.csv').entries;
    expect(skipDuplicates([result[0]], result)).toMatchObject({ duplicates: 1, fresh: [result[1]] });
  });
});
