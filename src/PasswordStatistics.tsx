import { useMemo, useState } from 'react';
import { BarChart3, ShieldCheck } from 'lucide-react';
import type { VaultData } from './types';
import { calculatePasswordSecurity } from './securityDashboard';
import { calculateInsights } from './insights';

type Props = { vault: VaultData; onOpen: (id: string) => void };

export function PasswordStatistics({vault,onOpen}:Props) {
  const stats = useMemo(()=>calculatePasswordSecurity(vault),[vault]);
  const insights = useMemo(()=>calculateInsights(vault),[vault]);
  const [filter,setFilter] = useState<'all'|'short'|'long'>('all');
  const lengths = stats.lengths.filter(row=>filter==='all'||(filter==='short'?row.length<12:row.length>=12));
  const max = Math.max(1,...lengths.map(row=>row.count));
  const maxStrength = Math.max(1,...Object.values(stats.distribution));
  const strengthLabels = [
    ['weak','Schwach'], ['fair','Mittel'], ['strong','Stark']
  ] as const;
  return <div className="insights-layout">
    <section className="insights-card">
      <h3><BarChart3 size={18}/> Passwortlängen</h3>
      <div className="insights-grid">
        <div className="insight-stat"><span>Minimum</span><strong>{stats.shortest ?? '–'}</strong></div>
        <div className="insight-stat"><span>Durchschnitt</span><strong>{stats.average ?? '–'}</strong></div>
        <div className="insight-stat"><span>Maximum</span><strong>{stats.longest ?? '–'}</strong></div>
      </div>
      <div className="security-chart-controls" role="group" aria-label="Passwortlängen filtern">
        {([['all','Alle'],['short','Unter 12'],['long','Ab 12']] as const).map(([id,label])=>
          <button key={id} type="button" className={filter===id?'active':''} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}
      </div>
      {lengths.length===0 ? <p className="insights-empty">Keine Passwörter in dieser Auswahl.</p> :
      <div className="security-histogram" role="img" aria-label="Histogramm der Passwortlängen">
        {lengths.map(row=><div className="security-bar-col" key={row.length} title={row.length+' Zeichen: '+row.count+' Passwörter'}>
          <strong>{row.count}</strong>
          <div className="security-bar-track"><div style={{height:(row.count/max*100)+'%'}}/></div>
          <small>{row.length}</small>
        </div>)}
      </div>}
      <p className="insights-disclaimer">Lokale Auswertung; Passwortinhalte werden nicht angezeigt oder übertragen.</p>
    </section>
    <section className="insights-card">
      <h3><ShieldCheck size={18}/> Stärkeverteilung (heuristisch)</h3>
      <div className="strength-distribution">
        {strengthLabels.map(([id,label])=><div className="strength-distribution-row" key={id}>
          <span>{label}</span><div className="insight-track"><div style={{width:stats.distribution[id]/maxStrength*100+'%'}}/></div>
          <strong>{stats.distribution[id]}</strong></div>)}
      </div>
    </section>
    <section className="insights-card"><h3>Häufigste Kategorien</h3>
      {insights.categories.filter(x=>x.count>0).slice(0,10).map(category=><div className="insight-row" key={category.name}><span>{category.name}</span><strong>{category.count}</strong></div>)}
    </section>
    <section className="insights-card"><h3>Häufigste Feldtypen</h3>
      {insights.fieldTypes.slice(0,10).map(field=><div className="insight-row" key={field.name}><span>{field.name}</span><strong>{field.count}</strong></div>)}
    </section>
    <section className="insights-card"><h3>Konten mit Sicherheitsbedarf</h3>
      {stats.recommendations.length===0 ? <p className="insights-empty">Keine Auffälligkeiten durch die lokale Heuristik.</p> :
        stats.recommendations.map(rec=><button key={rec.id} className="insight-link-row" onClick={()=>onOpen(rec.entryIds[0])}>
          <span>{rec.title} ({rec.count})</span><span>Eintrag öffnen</span></button>)}
    </section>
  </div>;
}

export function SecurityOverview({vault,onOpen}:Props) {
  const summary = useMemo(()=>calculatePasswordSecurity(vault),[vault]);
  return <section className="security-overview">
    <div className="security-score">
      <ShieldCheck size={24}/><div>
        <strong>{summary.score===null?'–':summary.score+'/100'}</strong>
        <p>Orientierungswert für {summary.totalPasswords} gespeicherte Passwörter – kein vollständiger Sicherheitscheck.</p>
      </div>
    </div>
    <div className="security-recommendations">
      <h3>Empfehlungen</h3>
      {summary.recommendations.length===0 ? <p>Keine schwachen oder mehrfach verwendeten Passwörter gefunden.</p> :
      summary.recommendations.map(rec=><button key={rec.id} type="button" onClick={()=>onOpen(rec.entryIds[0])} className="security-recommendation">
        <span><strong>{rec.count} × {rec.title}</strong><small>{rec.detail}</small></span><span>Prüfen</span>
      </button>)}
    </div>
    <p className="insights-disclaimer">Die Prüfung erfolgt nur nach Entsperrung und vollständig auf diesem Gerät. Es findet keine Datenleck-Abfrage statt.</p>
  </section>;
}
