import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Eye, EyeOff, KeyRound, Pencil, Sparkles, X } from 'lucide-react';
import { blankEntry } from './types';
import type { VaultEntry } from './types';
import { generateStrongPassword } from './passwordGenerator';

export default function QuickAdd({ onClose, onSave, onAdvanced }: {
  onClose: () => void;
  onSave: (entry: VaultEntry) => Promise<void>;
  onAdvanced: (entry: VaultEntry) => void;
}) {
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function entry(): VaultEntry {
    return { ...blankEntry(), title: title.trim(), username: username.trim(), password,
      passwordChangedAt: password ? Date.now() : undefined };
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setError('Bitte einen Namen angeben.'); return; }
    setBusy(true); setError('');
    try { await onSave(entry()); onClose(); }
    catch { setError('Eintrag konnte nicht gespeichert werden.'); }
    finally { setBusy(false); }
  }
  return <div className="overlay" role="presentation" onMouseDown={event => { if(event.target === event.currentTarget) onClose(); }}>
    <section className="sheet quick-sheet" role="dialog" aria-modal="true" aria-label="Schnellanlage">
      <header className="sheet-header"><KeyRound size={20}/><h2>Schnell speichern</h2><button className="icon-btn" type="button" onClick={onClose} aria-label="Schließen"><X size={19}/></button></header>
      <form className="editor-form" onSubmit={e => void submit(e)}>
        <p className="input-help">In wenigen Sekunden einen Zugang anlegen. Weitere Angaben kannst du später ergänzen.</p>
        <label>Name / Dienst<input autoFocus placeholder="z. B. E-Mail, Bank, WLAN" value={title} maxLength={120} onChange={e => setTitle(e.target.value)}/></label>
        <label>Benutzername<input autoComplete="off" placeholder="Benutzername" value={username} onChange={e => setUsername(e.target.value)}/></label>
        <label>Passwort<div className="quick-secret">
          <input autoComplete="new-password" type={visible ? 'text' : 'password'} value={password} placeholder="Passwort" onChange={e => setPassword(e.target.value)}/>
          <button type="button" className="icon-btn" onClick={() => setVisible(!visible)} title="Passwort anzeigen">{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          <button type="button" className="icon-btn" onClick={() => { setPassword(generateStrongPassword()); setVisible(true); }} title="Sicheres Passwort erstellen"><Sparkles size={18}/></button>
        </div></label>
        {error && <p className="error-box" role="alert">{error}</p>}
        <div className="sheet-actions"><button type="button" className="secondary-btn" onClick={() => { onAdvanced(entry()); onClose(); }}><Pencil size={16}/> Mehr Felder</button><button type="submit" className="primary-btn" disabled={busy}><Check size={17}/> Sicher speichern</button></div>
      </form>
    </section>
  </div>;
}
