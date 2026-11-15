import type { VaultData } from './types';
import { passwordStrength } from './insights';
import { entriesAt } from './vaultLifecycle';

export type Recommendation = { id: 'weak'|'reused'|'short'; title: string; detail: string; count: number; entryIds: string[] };
export type PasswordSecurityDashboard = {
  score: number | null;
  totalPasswords: number;
  lengths: { length: number; count: number }[];
  shortest: number | null;
  average: number | null;
  longest: number | null;
  distribution: { weak: number; fair: number; strong: number };
  recommendations: Recommendation[];
};

/** Offline-only heuristics. No credential or hash is retained in the returned data. */
export function calculatePasswordSecurity(vault: VaultData): PasswordSecurityDashboard {
  const entries = entriesAt(vault, 'active').filter(entry => entry.password.length > 0);
  const histogram = new Map<number, number>();
  const duplicates = new Map<string, string[]>();
  const weak: string[] = [], short: string[] = [];
  const distribution = { weak: 0, fair: 0, strong: 0 };
  let lengthSum = 0;
  for (const entry of entries) {
    const length = [...entry.password].length;
    histogram.set(length, (histogram.get(length) ?? 0) + 1);
    lengthSum += length;
    const strength = passwordStrength(entry.password);
    if (strength !== 'missing') distribution[strength]++;
    if (strength === 'weak') weak.push(entry.id);
    if (length < 12) short.push(entry.id);
    duplicates.set(entry.password, [...(duplicates.get(entry.password) ?? []), entry.id]);
  }
  const reused = [...new Set([...duplicates.values()].filter(group => group.length > 1).flat())];
  const recommendations: Recommendation[] = [];
  if (reused.length) recommendations.push({id:'reused', title:'Mehrfach verwendete Passwörter', count:reused.length,
    detail:'Für jeden Zugang ein eigenes Passwort wählen.', entryIds:reused});
  if (weak.length) recommendations.push({id:'weak', title:'Schwache Passwörter', count:weak.length,
    detail:'Längere, zufällig generierte Passwörter verwenden.', entryIds:weak});
  if (short.length) recommendations.push({id:'short', title:'Kurze Passwörter', count:short.length,
    detail:'Nach Möglichkeit mindestens 12 Zeichen verwenden.', entryIds:short});
  const total = entries.length;
  // Indicative local score only; not a promise of account safety.
  const score = total ? Math.max(0, Math.min(100, Math.round(100 -
    40 * reused.length / total - 40 * weak.length / total - 20 * short.length / total))) : null;
  const lengths = [...histogram].map(([length,count]) => ({length,count})).sort((a,b)=>a.length-b.length);
  return {score, totalPasswords:total, lengths,
    shortest: lengths[0]?.length ?? null, average: total ? Math.round(lengthSum / total * 10) / 10 : null,
    longest: lengths.at(-1)?.length ?? null, distribution, recommendations};
}
