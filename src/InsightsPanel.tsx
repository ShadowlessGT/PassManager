import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CalendarClock, Copy, Eye, Fingerprint, KeyRound, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
import type { VaultData, VaultEntry } from './types';
import { calculateInsights } from './insights';

type Props = {
  data: VaultData;
  onOpen: (id: string) => void;
  onDeleteHistory: (id: string) => Promise<void>;
};

function Bars({ title, items, empty = 'Noch keine Daten' }: {
  title: string; items: { name: string; count: number }[]; empty?: string
}) {
  const max = Math.max(1, ...items.map(x => x.count));
  return <section className="insights-card">
    <h3>{title}</h3>
    {items.length === 0 && <p className="insights-empty">{empty}</p>}
    {items.slice(0, 8).map(item => <div key={item.name} className="insight-bar">
      <div className="insight-row"><span>{item.name}</span><strong>{item.count}</strong></div>
      <div className="insight-track"><div style={{ width: Math.max(2, item.count / max * 100) + '%' }}/></div>
    </div>)}
  </section>;
}
function Stat({ name, amount, icon: Icon }: { name: string; amount: number; icon: typeof KeyRound }) {
  return <article className="insight-stat"><div className="insight-stat-header"><span>{name}</span><Icon size={18}/></div><strong>{amount}</strong></article>;
}

export default function InsightsPanel({ data, onOpen, onDeleteHistory }: Props) {
  const stats = useMemo(() => calculateInsights(data), [data]);
  const [mode, setMode] = useState<'overview' | 'security' | 'history'>('overview');
  const recentHistory = useMemo(() => data.entries.filter(e => (e.passwordHistory?.length ?? 0) > 0)
    .sort((a, b) => (b.passwordHistory?.at(-1)?.replacedAt ?? 0) - (a.passwordHistory?.at(-1)?.replacedAt ?? 0)), [data]);
  const duplicateEntries = new Set(stats.security.reusedGroups.flatMap(g => g.entryIds));
  const vulnerable = data.entries.filter(e => duplicateEntries.has(e.id));
  return <div className="insights-layout">
    <div className="insight-tabs" role="tablist" aria-label="Statistiken">
      {([{id:'overview',label:'Nutzung'}, {id:'security',label:'Sicherheit'}, {id:'history',label:'Historie'}] as const).map(t =>
        <button key={t.id} type="button" role="tab" aria-selected={mode === t.id} className={mode === t.id ? 'selected' : ''} onClick={() => setMode(t.id)}>{t.label}</button>)}
    </div>
    {mode === 'overview' && <>
      <div className="insights-grid">
        <Stat name="Einträge" amount={stats.total} icon={KeyRound}/>
        <Stat name="Kategorien" amount={stats.categories.length} icon={BarChart3}/>
        <Stat name="Personen" amount={stats.people} icon={UsersRound}/>
        <Stat name="Geöffnet" amount={stats.activity.opens} icon={Eye}/>
        <Stat name="Kopiert" amount={stats.activity.copies} icon={Copy}/>
        <Stat name="Sichtbar gemacht" amount={stats.activity.reveals} icon={Fingerprint}/>
      </div>
      <p className="insights-disclaimer"><ShieldCheck size={15}/> Alle Zähler liegen verschlüsselt in deinem Tresor. „Kopiert“ bedeutet nicht automatisch erfolgreich angemeldet. Die Erfassung beginnt ab dieser Version.</p>
      <Bars title="Einträge nach Kategorie" items={stats.categories}/>
      <Bars title="Am häufigsten geöffnete Einträge" items={stats.mostOpened} empty="Noch keine Einträge geöffnet"/>
      <Bars title="Am häufigsten kopierte Einträge" items={stats.mostCopied} empty="Noch keine Werte kopiert"/>
      <Bars title="Meistverwendete Feldtypen" items={stats.fieldTypes}/>
      <Bars title="Am häufigsten kopierte Feldtypen" items={stats.copiedFields}/>
    </>}
    {mode === 'security' && <>
      <div className="insights-grid">
        <Stat name="Eindeutige Passwörter" amount={stats.security.unique} icon={ShieldCheck}/>
        <Stat name="Mehrfach verwendete Einträge" amount={stats.security.reused} icon={AlertTriangle}/>
        <Stat name="Schwach (Heuristik)" amount={stats.security.weak} icon={AlertTriangle}/>
        <Stat name="Ohne Passwort" amount={stats.security.withoutPassword} icon={KeyRound}/>
      </div>
      <p className="insights-disclaimer"><ShieldCheck size={15}/> Analyse vollständig offline. Passwortwerte werden nur im Arbeitsspeicher verglichen und nie in der Statistik angezeigt. Eine Heuristik ersetzt keine Sicherheitsprüfung.</p>
      <section className="insights-card">
        <h3><AlertTriangle size={17}/> Mehrfach verwendete Passwörter</h3>
        {vulnerable.length === 0 ? <p className="insights-empty">Keine identischen Hauptpasswörter in mehreren Einträgen entdeckt.</p> :
          vulnerable.map(entry => <button type="button" key={entry.id} className="insight-link-row" onClick={() => onOpen(entry.id)}><span>{entry.title}</span><span>Eintrag öffnen →</span></button>)}
      </section>
      <section className="insights-card">
        <h3>Datenschutz</h3>
        <p className="insights-empty">Keine Serveranalyse und keine Übertragung von Passwortwerten. Die Kompromittierungsprüfung gegen externe Datenbanken ist noch nicht aktiviert.</p>
      </section>
    </>}
    {mode === 'history' && <section className="insights-card">
      <h3><CalendarClock size={17}/> Gesicherte Passwort-Historie</h3>
      <p className="insights-empty">Bis zu 10 vorherige Hauptpasswörter pro Eintrag werden verschlüsselt aufbewahrt. Sie sind ausschließlich nach dem Entsperren des Tresors zugänglich und werden hier nicht im Klartext angezeigt.</p>
      {recentHistory.length === 0 ? <p className="insights-empty">Noch keine Passwortwechsel gespeichert.</p> :
        recentHistory.map(entry => <HistoryEntry key={entry.id} entry={entry} onOpen={onOpen} onDeleteHistory={onDeleteHistory}/>)}
    </section>}
  </div>;
}

function HistoryEntry({entry, onOpen, onDeleteHistory}: {entry:VaultEntry;onOpen:(id:string)=>void;onDeleteHistory:(id:string)=>Promise<void>}) {
  return <div className="history-row"><div><strong>{entry.title}</strong><small>{entry.passwordHistory?.length ?? 0} vorherige Passwörter · Letzter Wechsel {new Date(entry.passwordChangedAt ?? entry.passwordHistory?.at(-1)?.replacedAt ?? entry.updatedAt).toLocaleDateString('de-DE')}</small></div>
    <div className="history-actions"><button className="secondary-btn" type="button" onClick={() => onOpen(entry.id)}>Anzeigen</button>
      <button className="icon-btn" type="button" title="Historie löschen" aria-label="Historie löschen" onClick={() => { if(window.confirm('Gesamte Passwort-Historie von "' + entry.title + '" löschen?')) void onDeleteHistory(entry.id); }}><Trash2 size={17}/></button></div>
  </div>;
}
