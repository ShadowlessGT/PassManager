import { useState } from 'react';
import type { VaultEntry } from './types';

/** Never use third-party icon aggregation services. Direct HTTPS request is
 * opt-in only, no referrer, and never to local or numeric hostnames. */
export function websiteFavicon(input: string): string | null {
  try {
    const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : 'https://' + input;
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || !host.includes('.') ||
      host === 'localhost' || /(?:\.local|\.lan|\.home|\.internal|\.test|\.example)$/i.test(host) ||
      host.includes(':') || host.includes('[') || host.includes(']') || /^[0-9.]+$/.test(host) || !/^[a-z0-9.-]+$/.test(host)) return null;
    return parsed.origin + '/favicon.ico';
  } catch { return null; }
}

export default function EntryAvatar({ item, allowRemote }: { item: VaultEntry; allowRemote:boolean }) {
  const [failed,setFailed] = useState<string|null>(null);
  const source = allowRemote && !item.images[0] ? websiteFavicon(item.website) : null;
  const name = item.title.trim();
  const fallback = name ? name.slice(0,2).toUpperCase() : 'P';
  return <span className="entry-avatar">
    {item.images[0] ? <img src={item.images[0]} alt="" /> :
      source && failed!==source ? <img src={source} referrerPolicy="no-referrer" alt=""
        onError={()=>setFailed(source)} loading="lazy" /> : fallback}
  </span>;
}
