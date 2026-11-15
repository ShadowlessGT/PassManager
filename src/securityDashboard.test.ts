import { describe, it, expect } from 'vitest';
import { newVault, blankEntry } from './types';
import { calculatePasswordSecurity } from './securityDashboard';
import { moveEntry } from './vaultLifecycle';

describe('local security dashboard', () => {
  it('does not invent a score for an empty vault', () => {
    const output = calculatePasswordSecurity(newVault());
    expect(output.score).toBeNull();
    expect(output.recommendations).toHaveLength(0);
  });
  it('excludes archived and trashed entries and never exposes passwords', () => {
    const base = { ...newVault(), entries: [
      {...blankEntry(), id:'one', title:'One', password:'password1'},
      {...blankEntry(), id:'two', title:'Two', password:'password1'},
      {...blankEntry(), id:'three', title:'Three', password:'LongStrongGenerated#42'},
    ] };
    const output = calculatePasswordSecurity(moveEntry(base,'three','archived'));
    expect(output.totalPasswords).toBe(2);
    expect(output.recommendations.find(item => item.id==='reused')?.count).toBe(2);
    expect(output.lengths).toEqual([{length:9,count:2}]);
    expect(JSON.stringify(output)).not.toContain('password1');
  });
  it('scores healthy passwords without false incidents', () => {
    const base = { ...newVault(), entries: [{...blankEntry(), password:'VeryStrong#Random2026Alpha'}] };
    expect(calculatePasswordSecurity(base).score).toBe(100);
  });
});
