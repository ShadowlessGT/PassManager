import { describe, it, expect } from 'vitest';
import { snapshotDue, keepNewestSnapshots } from './snapshotPolicy';
describe('encrypted local snapshot policy', () => {
 it('limits the interval and recovers if there is no copy',()=>{
  expect(snapshotDue(null,4000,3600)).toBe(true);
  expect(snapshotDue(2000,4000,3600)).toBe(false);
  expect(snapshotDue(2000,5600,3600)).toBe(true);
 });
 it('keeps newest timestamps within configured retention',()=>{
  expect(keepNewestSnapshots(['a','c','b','b'],2)).toEqual({keep:['c','b'],remove:['a']});
 });
});
