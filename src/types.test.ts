import { describe, expect, it } from 'vitest';
import { blankEntry, makeField, validateEntryFields } from './types';

describe('flexible encrypted item fields', () => {
  it('keeps default Free entries simple', () => {
    expect(blankEntry().fields).toEqual([]);
  });
  it('accepts numeric PINs and rejects other characters', () => {
    const pin = makeField('PIN', 'pin', '12345');
    expect(validateEntryFields([pin])).toBe(null);
    expect(validateEntryFields([{...pin, value: '12ab'}])).toMatch(/Ziffern/);
  });
});
