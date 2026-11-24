import type { ActivityKind, VaultData } from './types';
import { logActivity } from './insights';

/** Counters are best-effort analytics, never credential data. */
export type PendingActivity = {
  entryId: string;
  kind: ActivityKind;
  fieldType?: string;
  at: number;
};

/** Coalesce usage events into a single encrypted vault write. */
export function applyActivityBatch(vault: VaultData, events: readonly PendingActivity[]): VaultData {
  if (!events.length) return vault;
  const grouped = new Map<string, PendingActivity[]>();
  for (const event of events) {
    const group = grouped.get(event.entryId) ?? [];
    group.push(event);
    grouped.set(event.entryId, group);
  }
  let touched = false;
  const entries = vault.entries.map(entry => {
    const activity = grouped.get(entry.id);
    if (!activity) return entry;
    touched = true;
    return activity.reduce(
      (current, event) => logActivity(current, event.kind, event.fieldType, event.at),
      entry
    );
  });
  return touched ? { ...vault, entries } : vault;
}
