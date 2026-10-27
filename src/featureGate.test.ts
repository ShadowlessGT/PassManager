import { describe, expect, it } from 'vitest';
import { blankEntry } from './types';
import { freeEntryEditError } from './featureGate';

describe('Parola Free features', () => {
  it('allows ordinary login details', () => {
    const entry = { ...blankEntry(), title: 'Account', email: 'mail@example.com', username: 'user', password: 'secret' };
    expect(freeEntryEditError(undefined, entry)).toBeNull();
  });
  it('rejects custom fields and images in new entries', () => {
    const entry = blankEntry();
    expect(freeEntryEditError(undefined, { ...entry, images: ['data:image/png;base64,AA=='] })).toMatch(/Ultra/);
    expect(freeEntryEditError(undefined, { ...entry, fields: [{ id: 'a', label: 'PIN', kind: 'pin', value: '1234', createdAt: 1, updatedAt: 1 }] })).toMatch(/Ultra/);
  });
  it('does not lock previous custom data when a basic field changes', () => {
    const existing = { ...blankEntry(), notes: 'old private note', images: ['encrypted-old'], fields: [{ id: 'a', label: 'old', kind: 'text' as const, value: 'value', createdAt: 1, updatedAt: 1 }] };
    expect(freeEntryEditError(existing, { ...existing, username: 'new' })).toBeNull();
    expect(freeEntryEditError(existing, { ...existing, notes: 'changed' })).toMatch(/Ultra/);
    expect(freeEntryEditError(existing, { ...existing, images: [...existing.images, 'new'] })).toMatch(/Ultra/);
  });
  it('permits removing old premium fields while staying Free', () => {
    const existing = { ...blankEntry(), notes: 'old', images: ['old'], fields: [{ id: 'a', label: 'field', kind: 'text' as const, value: 'old', createdAt: 1, updatedAt: 1 }] };
    expect(freeEntryEditError(existing, { ...existing, notes: '', fields: [], images: [] })).toBeNull();
  });
});