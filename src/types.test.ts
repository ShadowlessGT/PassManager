import { describe, expect, it } from 'vitest';
import { blankEntry, makeField, validateEntryFields } from './types';

describe('flexible encrypted item fields', () => {
  it('predefines PIN and address on new entries', () => {
    expect(blankEntry().fields?.map(f => [f.label, f.kind])).toEqual([['PIN', 'pin'], ['Adresse', 'multiline']]);
  });
  it('accepts numeric PINs and rejects other characters', () => {
    const pin = makeField('PIN', 'pin', '12345');
    expect(validateEntryFields([pin])).toBe(null);
    expect(validateEntryFields([{...pin, value: '12ab'}])).toMatch(/Ziffern/);
  });
});
