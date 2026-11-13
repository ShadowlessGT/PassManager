export const SNAPSHOT_INTERVALS = [
  {value: 60*60*1000,label:'Stündlich (bei Änderungen)'},
  {value: 24*60*60*1000,label:'Täglich (bei Änderungen)'},
  {value: 7*24*60*60*1000,label:'Wöchentlich (bei Änderungen)'},
] as const;
export function snapshotDue(last: number | null, now: number, interval: number): boolean {
  return last === null || now - last >= interval;
}
export function keepNewestSnapshots(ids: string[], max: number): {keep:string[];remove:string[]} {
  const sorted = [...new Set(ids)].sort().reverse();
  const limit = Math.max(1,Math.min(30,Math.floor(max)));
  return {keep:sorted.slice(0,limit),remove:sorted.slice(limit)};
}
