import { describe, it, expect } from 'vitest';
import { mapPasswordSafeRelational } from './passwordSafeRelational';
import type { PasswordSafeRelationalResult } from './passwordSafeRelational';

function fixture(): PasswordSafeRelationalResult {
  return {
    format: 'passwordsafe-relational-v1',
    sqlcipherFormat: 'sqlcipher-v4',
    session: 'sample-private-session',
    entries: [
      {
        sourceId: '31', title: 'Example Portal', createdAt: '1699999999000',
        modifiedAt: '1700000000000', favorite: true, archived: false,
        categories: ['Private', 'Finance'],
        fields: [
          { label: 'Benutzername', standardKey: 'username', isPassword: false,
            isWebsite: false, value: 'dummy-user' },
          { label: 'Passwort', standardKey: 'password', isPassword: true,
            isWebsite: false, value: 'not-a-real-secret' },
          { label: 'Webseite', standardKey: 'website', isPassword: false,
            isWebsite: true, value: 'https://example.invalid' },
          { label: 'PIN', standardKey: '', isPassword: true,
            isWebsite: false, value: '1234' },
          { label: 'E-Mail', standardKey: '', isPassword: false,
            isWebsite: false, value: 'test@example.invalid' }
        ],
        images: [{ id: '41', byteLength: 735816 },{ id: '42', byteLength: 170000 }],
        history: [{ value: 'dummy-previous', timestamp: '2023-10-01 12:00:00', label: 'Passwort', standardKey: 'password', isPassword: true }]
      },
      {
        sourceId: '32', title: 'Another Entry', createdAt: '1700000000000',
        modifiedAt: '1700000000000', favorite: false, archived: true,
        categories: ['Private'], fields: [], images: [], history: []
      }
    ],
    imageCount: 2, totalImageBytes: 905816,
    categoryCount: 2, historyCount: 1,
    sourceCategories: [{ name: 'Private', color: '#AA4455' }, { name: 'Finance', color: '#224466' }],
    unsupported: { OTP: 0, Attachments: 0, Passkeys: 0, Tombstones: 0 },
    readRows: 2
  };
}

describe('relational Password Safe source migration', () => {
  it('links password values, categories, images and history without loading original image bytes', () => {
    const mapped = mapPasswordSafeRelational(fixture());
    expect(mapped.entries).toHaveLength(2);
    const account = mapped.entries[0];
    expect(account.title).toBe('Example Portal');
    expect(account.username).toBe('dummy-user');
    expect(account.password).toBe('not-a-real-secret');
    expect(account.email).toBe('test@example.invalid');
    expect(account.website).toBe('https://example.invalid');
    expect(account.categories).toEqual(['Private','Finance']);
    expect(account.favorite).toBe(true);
    expect(account.fields).toEqual(expect.arrayContaining([expect.objectContaining({
      label: 'PIN', kind: 'pin', value: '1234'
    })]));
    expect(account.passwordHistory).toHaveLength(1);
    expect(account.keepPasswordHistory).toBe(true);
    expect(account.images).toEqual([]);
    expect(mapped.imageRefsByEntryId[account.id]).toEqual(['41','42']);
    expect(mapped.imageCount).toBe(2);
    expect(mapped.requiresPartialImportConfirmation).toBe(false);
    expect(mapped.entries[1].lifecycle?.state).toBe('archived');
  });

  it('fails closed if an image association is missing', () => {
    const x = fixture();
    x.imageCount = 3;
    expect(() => mapPasswordSafeRelational(x)).toThrow(/Quellbilder/);
  });

  it('fails closed if encrypted-source history is incomplete', () => {
    const x = fixture();
    x.historyCount = 10;
    expect(() => mapPasswordSafeRelational(x)).toThrow(/Passworthistorie/);
  });

  it('requires explicit confirmation when an unsupported passkey or attachment exists', () => {
    const x = fixture();
    x.unsupported.Passkeys = 2;
    x.unsupported.Attachments = 1;
    const result = mapPasswordSafeRelational(x);
    expect(result.requiresPartialImportConfirmation).toBe(true);
    expect(result.warnings.join(' ')).toContain('Passkeys');
    expect(result.warnings.join(' ')).toContain('Attachments');
  });

  it('keeps history of a custom secret separate from the main password history', () => {
    const x = fixture();
    x.entries[0].history.push({
      value: 'synthetic-old-custom-secret', timestamp: '2022-07-01 12:00:00',
      label: 'Bank-Zugangsschlüssel', standardKey: '', isPassword: true
    });
    x.historyCount = 2;
    const m = mapPasswordSafeRelational(x);
    expect(m.entries[0].passwordHistory).toHaveLength(1);
    expect(m.entries[0].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'secret', value: 'synthetic-old-custom-secret' })
    ]));
  });

  it('accepts a synthetic full-size source with 324 entries, 93 photos and 399 histories', () => {
    const x = fixture();
    const base = x.entries[0];
    x.entries = Array.from({ length: 324 }, (_, index) => ({
      ...base,
      sourceId: String(index + 1),
      title: 'Synthetic record ' + index,
      images: index < 93 ? [{ id: String(index + 1), byteLength: 167000 }] : [],
      history: index < 75
        ? [{ value: 'synthetic-history-' + index, timestamp: '2022-07-01 12:00:00',
             label: 'Passwort', standardKey: 'password', isPassword: true }]
        : []
    }));
    // Add the remaining 324 histories without exceeding the per-entry source limit.
    for (let j = 0; j < 324; j++) {
      x.entries[j].history.push({
        value: 'synthetic-second-history-' + j,
        timestamp: '2022-08-01 12:00:00',
        label: 'Passwort', standardKey: 'password', isPassword: true
      });
    }
    x.readRows = 324;
    x.imageCount = 93;
    x.historyCount = 399;
    x.categoryCount = 24;
    const m = mapPasswordSafeRelational(x);
    expect(m.entries).toHaveLength(324);
    expect(m.imageCount).toBe(93);
    expect(m.sourceHistoryCount).toBe(399);
    expect(m.entries.reduce((total, entry) => total + (entry.passwordHistory?.length ?? 0), 0)).toBe(399);
  });

  it('rejects ambiguous duplicate source IDs and rows', () => {
    const x = fixture();
    x.entries[1].sourceId = '31';
    expect(() => mapPasswordSafeRelational(x)).toThrow(/Beziehungen/);
    x.entries[1].sourceId = '32';
    x.readRows = 3;
    expect(() => mapPasswordSafeRelational(x)).toThrow(/Einträge fehlen/);
  });

  it('preserves empty entry metadata and all category names', () => {
    const m = mapPasswordSafeRelational(fixture());
    expect(m.sourceCategoryCount).toBe(2);
    expect(m.sourceCategories).toEqual([{ name: 'Private', color: '#AA4455' }, { name: 'Finance', color: '#224466' }]);
    expect(m.sourceHistoryCount).toBe(1);
    expect(m.entries[1].title).toBe('Another Entry');
    expect(m.entries[1].categories).toEqual(['Private']);
  });
});
