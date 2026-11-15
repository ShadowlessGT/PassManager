import { describe, expect, it } from 'vitest';
import { mapPasswordSafeDatabase } from './passwordSafeDb';
import type { EncryptedPasswordSafeResult } from './passwordSafeDb';

describe('Password Safe encrypted SQLCipher database mapper', () => {
  it('converts recognized fields without exposing data on unknown columns', () => {
    const source: EncryptedPasswordSafeResult = {
      format: 'sqlcipher-v4',
      tables: [{
        name: 'entries',
        columns: ['id','name','username','password','website','notes','pin','recovery_code','category','created_at'],
        rows: [
          { id:'1', name:'Fiktives Konto', username:'beispiel', password:'TEST_ONLY_SECRET',
            website:'https://example.invalid', notes:'Eine Notiz', pin:'1234',
            recovery_code:'LOCAL_FAKE_RECOVERY', category:'Privat|Finanzen', created_at:'1731500000' }
        ]
      }],
      readRows: 1,
      omittedBinaryFields: 0
    };
    const converted = mapPasswordSafeDatabase(source);
    expect(converted.entries).toHaveLength(1);
    expect(converted.entries[0]).toMatchObject({
      title:'Fiktives Konto', username:'beispiel', password:'TEST_ONLY_SECRET',
      categories:['Privat','Finanzen']
    });
    expect(converted.entries[0].fields?.find(field => field.label === 'pin')).toMatchObject({kind:'pin',value:'1234'});
    expect(converted.entries[0].fields?.find(field => field.label === 'recovery_code')).toMatchObject({kind:'secret'});
    expect(converted.requiresPartialImportConfirmation).toBe(false);
  });

  it('requires explicit consent when unknown attachment tables or binaries are present', () => {
    const source: EncryptedPasswordSafeResult = {
      format:'sqlcipher-v4',
      tables:[
        {name:'entries',columns:['name','password'],rows:[{name:'Beispiel',password:'SYNTHETIC'}]},
        {name:'attachments',columns:['entryId','image'],rowCount:2,rows:[]}
      ],
      readRows:1,omittedBinaryFields:2
    };
    const result = mapPasswordSafeDatabase(source);
    expect(result.requiresPartialImportConfirmation).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('refuses to invent entries for unknown source schema', () => {
    expect(() => mapPasswordSafeDatabase({
      format:'sqlcipher-v4',
      tables:[{name:'encrypted_records',columns:['row_id','cipher_bytes'],rows:[]}],
      readRows:0,omittedBinaryFields:0
    })).toThrow(/Tabellenformat/);
  });

  it('refuses unsupported SQLCipher version', () => {
    expect(() => mapPasswordSafeDatabase({
      format:'sqlite',tables:[],readRows:0,omittedBinaryFields:0
    })).toThrow(/Nicht unterstütztes/);
  });
});
