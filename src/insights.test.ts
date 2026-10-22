import { describe, it, expect } from 'vitest';
import { blankEntry, newVault, makeField } from './types';
import { calculateInsights, logActivity, trackPasswordHistory, passwordStrength } from './insights';

describe('local and private vault insights', () => {
  it('counts multiple reused passwords without including secret values', () => {
    const a = { ...blankEntry(), title:'A', password:'same-secret-123!!', categories:['Privat','Arbeit'], fields:[makeField('PIN','pin','1234')] };
    const b = { ...blankEntry(), title:'B', password:'same-secret-123!!', categories:['Privat'] };
    const c = { ...blankEntry(), title:'C', password:'different-Secret-!987' };
    const snapshot = calculateInsights({ ...newVault(), entries:[a,b,c] });
    expect(snapshot.security.unique).toBe(2);
    expect(snapshot.security.reused).toBe(2);
    expect(snapshot.categories).toEqual([{ name:'Privat', count:2 },{ name:'Arbeit', count:1 }]);
    expect(snapshot.fieldTypes.some(f => f.name === 'PIN' && f.count === 1)).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain('same-secret-123!!');
  });
  it('tracks field copy and opens, and retains latest 10 history items', () => {
    let entry = { ...blankEntry(), password:'an-old-password', keepPasswordHistory:true };
    for (let i = 0; i < 11; i++) {
      const next = { ...entry, password:'new-password-' + i };
      entry = trackPasswordHistory(entry, next);
    }
    expect(entry.passwordHistory?.length).toBe(10);
    entry = logActivity(entry, 'open', undefined, 100);
    entry = logActivity(entry, 'copy', 'PIN', 200);
    expect(entry.activity).toMatchObject({ opens:1, copies:1, lastOpenedAt:100, fieldCopies:{ PIN:1 } });
  });
  it('never treats short numeric passwords as strong', () => {
    expect(passwordStrength('1234')).toBe('weak');
    expect(passwordStrength('')).toBe('missing');
  });
});
