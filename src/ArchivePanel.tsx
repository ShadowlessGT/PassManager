import { useState } from 'react';
import { Archive, RotateCcw, Trash2, ShieldAlert } from 'lucide-react';
import type { VaultData } from './types';
import { entriesAt } from './vaultLifecycle';

type Props = {
  vault: VaultData;
  onRestore: (id: string) => Promise<void>;
  onTrash: (id: string) => Promise<void>;
  onErase: (id: string) => Promise<void>;
};
export default function ArchivePanel({ vault, onRestore, onTrash, onErase }: Props) {
  const [view, setView] = useState<'archived'|'trashed'>('archived');
  const [busy, setBusy] = useState<string|null>(null);
  const [error, setError] = useState('');
  const archive = entriesAt(vault,'archived');
  const trash = entriesAt(vault,'trashed');
  const items = view === 'archived' ? archive : trash;
  async function action(id: string, op: 'restore'|'trash'|'erase', title: string) {
    if (op === 'erase' && (!window.confirm('"' + title + '" dauerhaft aus Parola entfernen?') ||
      window.prompt('Zum unwiderruflichen Löschen LÖSCHEN eingeben:') !== 'LÖSCHEN')) return;
    setBusy(id); setError('');
    try { await (op === 'restore' ? onRestore(id) : op === 'trash' ? onTrash(id) : onErase(id)); }
    catch(e) { setError(e instanceof Error ? e.message : 'Aktion fehlgeschlagen.'); }
    finally { setBusy(null); }
  }
  return <section className="archive-page">
    <div className="insight-tabs" role="tablist" aria-label="Archiv und Papierkorb">
      <button role="tab" type="button" aria-selected={view==='archived'} className={view==='archived'?'selected':''} onClick={()=>setView('archived')}>
        <Archive size={17}/> Archiv ({archive.length})
      </button>
      <button role="tab" type="button" aria-selected={view==='trashed'} className={view==='trashed'?'selected':''} onClick={()=>setView('trashed')}>
        <Trash2 size={17}/> Papierkorb ({trash.length})
      </button>
    </div>
    <p className="settings-note"><ShieldAlert size={16}/> Beide Bereiche bleiben im verschlüsselten Tresor gespeichert.
      Papierkorb-Einträge werden nicht automatisch gelöscht. Nur das ausdrücklich bestätigte endgültige Löschen entfernt sie aus dem aktiven Tresor.</p>
    {items.length === 0 ? <div className="empty-state"><Archive size={26}/><h3>{view==='archived'?'Archiv ist leer':'Papierkorb ist leer'}</h3></div> :
      <div className="archive-rows">{items.map(item=><article className="archive-row" key={item.id}>
        <div><strong>{item.title}</strong><small>Seit {new Date(item.lifecycle?.changedAt ?? item.updatedAt).toLocaleDateString('de-DE')}</small></div>
        <div className="archive-actions">
          <button className="secondary-btn" disabled={busy!==null} onClick={()=>void action(item.id,'restore',item.title)}>
            <RotateCcw size={16}/> Wiederherstellen
          </button>
          {view==='archived' ?
            <button className="outline-btn" disabled={busy!==null} onClick={()=>void action(item.id,'trash',item.title)}><Trash2 size={16}/> Papierkorb</button> :
            <button className="danger-btn" disabled={busy!==null} onClick={()=>void action(item.id,'erase',item.title)}><Trash2 size={16}/> Endgültig löschen</button>}
        </div>
      </article>)}</div>}
    {error && <p className="error-box" role="alert">{error}</p>}
  </section>;
}
