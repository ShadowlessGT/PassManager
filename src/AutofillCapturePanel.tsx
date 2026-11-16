import { useEffect,useMemo,useState } from 'react';
import { Fingerprint,LockKeyhole,ShieldCheck,Trash2,Save,KeyRound } from 'lucide-react';
import type { VaultData,VaultEntry } from './types';
import {
  autofillAvailable,autofillStatus,discardCapturedLogin,listCapturedLogins,
  openAutofillSettings,readCapturedLogin,setAutofillEnabled
} from './androidAutofill';
import type { PendingLogin,PendingSecret,AutofillStatus } from './androidAutofill';
import { createCapturedEntry,possibleUpdates,updateCapturedEntry } from './autofillSuggestions';

type Props={vault:VaultData;onSave:(entry:VaultEntry)=>Promise<void>;compact?:boolean};

export default function AutofillCapturePanel({vault,onSave,compact=false}:Props) {
  const [status,setStatus]=useState<AutofillStatus|null>(null);
  const [pending,setPending]=useState<PendingLogin[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [capture,setCapture]=useState<PendingSecret|null>(null);
  const [selectedId,setSelectedId]=useState('');
  const [title,setTitle]=useState('');
  const [user,setUser]=useState('');
  const [website,setWebsite]=useState('');
  const [complete,setComplete]=useState('');

  async function refresh(){
    if(!autofillAvailable())return;
    try {
      const next=await autofillStatus();
      setStatus(next);
      if(next.captureEnabled && next.serviceSelected){
        setPending((await listCapturedLogins()).items.sort((a,b)=>b.capturedAt-a.capturedAt));
      }else setPending([]);
    }catch{setError('Android-Autofill konnte nicht abgefragt werden.');}
  }
  useEffect(()=>{
    void refresh();
    const visible=()=>{if(!document.hidden)void refresh();};
    document.addEventListener('visibilitychange',visible);
    window.addEventListener('focus',visible);
    return ()=>{document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',visible);};
  },[]);
  const matching=useMemo(()=>capture?possibleUpdates(vault,capture):[],[capture,vault]);

  async function toggle(enabled:boolean){
    if(busy)return;
    if(!enabled && pending.length>0 &&
      !window.confirm('Passworterkennung abschalten und alle noch nicht übernommenen, verschlüsselten Funde löschen?'))return;
    if(enabled && !window.confirm(
      'Parola darf von Android angebotene Login-Daten nach deiner Systembestätigung geschützt vormerken. Die Übernahme in deinen Tresor erfolgt erst nach Geräte- und Parola-Entsperrung. Aktivieren?'
    ))return;
    setBusy(true);setError('');
    try{
      await setAutofillEnabled(enabled);
      if(enabled)await openAutofillSettings();
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Aktivierung fehlgeschlagen.');}
    finally{setBusy(false);}
  }

  async function beginReview(meta:PendingLogin){
    if(busy)return;
    setBusy(true);setError('');setComplete('');
    try{
      const secret=await readCapturedLogin(meta.id);
      setCapture(secret);
      setSelectedId('');
      setTitle((secret.webDomain || secret.appPackage).slice(0,100));
      setUser(secret.username);
      setWebsite('');
    }catch{setError('Gerätefreigabe abgebrochen oder Login nicht mehr verfügbar.');}
    finally{setBusy(false);}
  }

  async function saveReview(){
    if(!capture || busy)return;
    setBusy(true);setError('');
    try{
      const existing=selectedId ? vault.entries.find(item=>item.id===selectedId && !item.lifecycle) : undefined;
      if(selectedId && !existing)throw new Error('Zu aktualisierender Eintrag wurde nicht gefunden.');
      if(existing && !window.confirm('Passwort von "'+existing.title+'" ersetzen? Das bisherige Passwort bleibt nach den Tresoreinstellungen im Passwortverlauf.'))return;
      const entry=existing?updateCapturedEntry(existing,capture):createCapturedEntry(capture,title,user,website);
      // This must finish writing to the AES-GCM encrypted Parola vault before
      // the sealed Android capture can be permanently acknowledged.
      await onSave(entry);
      try{await discardCapturedLogin(capture.id);}
      catch{setError('Im Tresor gespeichert, aber der Android-Fund konnte nicht entfernt werden. Bitte manuell löschen.');}
      setCapture(null);setSelectedId('');setComplete('Zugang verschlüsselt im Parola-Tresor gespeichert.');
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Übernahme fehlgeschlagen.');}
    finally{setBusy(false);}
  }

  async function discard(meta:PendingLogin){
    if(busy || !window.confirm('Diesen erkannten Zugang verwerfen? Er wird nicht in Parola gespeichert.'))return;
    setBusy(true);setError('');
    try{await discardCapturedLogin(meta.id);await refresh();}
    catch{setError('Fund konnte nicht entfernt werden.');}
    finally{setBusy(false);}
  }

  if(!autofillAvailable()){
    return compact?null:<section className="settings-card"><h2>Passwörter automatisch erkennen</h2>
      <p className="settings-note">Die Erkennung ist ausschließlich in der installierten Android-App verfügbar.</p></section>;
  }
  if(compact && (!status?.captureEnabled || !status.serviceSelected || pending.length===0))return null;

  return <section className={compact?'autofill-capture-card compact':'settings-card autofill-capture-card'}>
    <div className="settings-heading">
      <span className="settings-icon"><KeyRound size={22}/></span>
      <div><h2>{compact?'Neue Logins erkannt':'Automatische Passworterkennung'}</h2>
        <p>{compact ? pending.length+' Zugangsdaten warten auf Übernahme.' :
          'Android schlägt das Speichern nach Login oder Registrierung vor. Parola übernimmt nur nach deiner Bestätigung.'}</p>
      </div>
    </div>
    {!compact && <>
      <div className="settings-row"><div><strong>Passwörter erkennen und zum Speichern anbieten</strong>
        <small>{status?.captureEnabled ? (status.serviceSelected?'Android-Dienst aktiv':'Noch nicht als Android-Autofill-Dienst ausgewählt'):
          'Deaktiviert – erst manuell einschalten'}</small></div>
        <button type="button" role="switch" aria-checked={Boolean(status?.captureEnabled)}
          aria-label="Automatische Passworterkennung aktivieren"
          className={status?.captureEnabled?'toggle active':'toggle'} disabled={busy || !status?.supported}
          onClick={()=>void toggle(!status?.captureEnabled)}><span/></button>
      </div>
      {status?.captureEnabled && !status.serviceSelected && <button className="primary-btn" type="button" disabled={busy} onClick={()=>void openAutofillSettings().then(refresh).catch(()=>setError('Android-Einstellungen nicht verfügbar.'))}>
        Als Android-Autofill-Dienst auswählen
      </button>}
      <p className="settings-note">
        <ShieldCheck size={16}/> Erkennungen werden ausschließlich verschlüsselt und höchstens 7 Tage auf diesem Gerät vorgemerkt.
        Android zeigt vor dem Erfassen seinen eigenen Speichern-Dialog. Parola fragt vor der Übernahme zusätzlich deine Gerätesperre ab.
      </p>
      <p className="settings-note">Aktuell: Passworterkennung und Übernahme. Das Ausfüllen bestehender Passwörter in anderen Apps ist noch nicht freigeschaltet.</p>
    </>}
    {(pending.length>0 || !compact) && <div className="autofill-capture-list">
      <h3>Erkannte Logins ({pending.length})</h3>
      {pending.length===0 && <p className="settings-note">Noch keine Zugangsdaten erkannt. Teste nach Aktivierung ein unterstütztes Login-Formular.</p>}
      {pending.map(meta=><article className="autofill-capture-item" key={meta.id}>
        <div><strong>{meta.webDomain || meta.appPackage}</strong>
          <small>{meta.username || 'Ohne Benutzername'} · {new Date(meta.capturedAt).toLocaleString('de-DE')}</small>
          <small>App-Paket: {meta.appPackage}{meta.webDomain?' · Website ungeprüft':''}</small></div>
        <div className="archive-actions">
          <button type="button" className="secondary-btn" disabled={busy} onClick={()=>void beginReview(meta)}>
            <Fingerprint size={16}/> Prüfen
          </button>
          <button type="button" className="outline-btn" disabled={busy} onClick={()=>void discard(meta)}>
            <Trash2 size={16}/> Verwerfen
          </button>
        </div>
      </article>)}
    </div>}
    {capture && <div className="autofill-review" role="region" aria-label="Erkannten Login übernehmen">
      <h3><LockKeyhole size={18}/> Zugang prüfen und speichern</h3>
      <p className="master-warning"><strong>Quelle nicht verifiziert:</strong> {capture.appPackage}
        {capture.webDomain ? ' / '+capture.webDomain : ''}. Vergewissere dich, dass dies die richtige App oder Website ist.</p>
      {matching.length>0 && <label>Speichern als
        <select value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
          <option value="">Neuen Zugang anlegen</option>
          {matching.map(entry=><option key={entry.id} value={entry.id}>Vorhandenes Passwort aktualisieren: {entry.title}</option>)}
        </select>
      </label>}
      {!selectedId && <>
        <label>Name<input value={title} maxLength={150} onChange={e=>setTitle(e.target.value)}/></label>
        <label>Benutzername<input value={user} maxLength={320} onChange={e=>setUser(e.target.value)}/></label>
        <label>Website (optional, selbst prüfen)<input type="url" placeholder="https://example.com"
          value={website} maxLength={500} onChange={e=>setWebsite(e.target.value)}/></label>
      </>}
      <p className="settings-note">Passwort: •••••••••••• (wird hier nicht angezeigt). Der bestehende Tresor bleibt verschlüsselt.</p>
      <div className="cloud-buttons">
        <button className="primary-btn" type="button" disabled={busy} onClick={()=>void saveReview()}><Save size={16}/>
          {selectedId?'Passwort aktualisieren':'In Parola speichern'}</button>
        <button className="secondary-btn" type="button" disabled={busy} onClick={()=>{setCapture(null);setSelectedId('');}}>Abbrechen</button>
      </div>
    </div>}
    {complete && <p className="settings-note" role="status">{complete}</p>}
    {error && <p className="error-box" role="alert">{error}</p>}
  </section>;
}
