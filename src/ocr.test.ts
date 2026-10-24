import { describe, it, expect } from 'vitest';
import { parseRecognizedCredentials, ocrToNewEntry } from './ocr';

describe('on-device OCR draft parsing', () => {
  it('extracts clearly labeled credentials and needs confirmation', () => {
    const d = parseRecognizedCredentials('Dienst: Netzwerk\nBenutzername: Admin\nPasswort: Ex!ample_123\nPIN: 1234\nHomepage: https://example.org');
    expect(d).toMatchObject({title:'Netzwerk',username:'Admin',password:'Ex!ample_123',pin:'1234',website:'https://example.org'});
    expect(ocrToNewEntry(d).fields?.[0].value).toBe('1234');
    expect(ocrToNewEntry(d).notes).toBe('');
  });
  it('does not guess a password or numeric PIN from unlabeled text',()=>{
    const d=parseRecognizedCredentials('Mein Geheimwort\n123456\nKontakt user@example.com');
    expect(d.password).toBe('');
    expect(d.pin).toBe('');
    expect(d.email).toBe('user@example.com');
  });
});
