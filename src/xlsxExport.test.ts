import { describe, it, expect } from 'vitest';
import readXlsxFile from 'read-excel-file/node';
import { newVault, blankEntry } from './types';
import { exportVaultXlsx } from './xlsxExport';

describe('real Excel workbook export', () => {
  it('opens with the existing Excel importer and preserves multilingual cells and secrets as text',async()=>{
    const vault={ ...newVault(), entries:[
      {...blankEntry(),title:'Büro',username:'alice',password:'private-#123',
        notes:'Multiline\nsecond "quoted" row', categories:['Finanzen','München']},
      {...blankEntry(),title:'Budget',username:'=HYPERLINK("https://evil.example")',
        password:'+1',notes:'<script> & "quote"'}
    ]};
    const bytes=exportVaultXlsx(vault);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const parsed=await readXlsxFile(Buffer.from(bytes)) as unknown;
    const rows=Array.isArray(parsed) && Array.isArray(parsed[0]) ? parsed as unknown[][] :
      (parsed as {sheet:string;data:unknown[][]}[])[0].data;
    expect(rows[0][0]).toBe('Titel');
    expect(rows[1][0]).toBe('Büro');
    expect(rows[1][3]).toBe('private-#123');
    expect(rows[1][6]).toBe('Multiline\nsecond "quoted" row');
    expect(rows[2][2]).toContain('=HYPERLINK');
    expect(rows[2][3]).toContain('+1');
    expect(rows[2][6]).toBe('<script> & "quote"');
  });
});
