import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Eye, EyeOff, KeyRound, Pencil, Sparkles, X } from 'lucide-react';
import { blankEntry } from './types';
import type { VaultEntry } from './types';
import { generateStrongPassword } from './passwordGenerator';
import CategoryPicker from './CategoryPicker';
import type { VaultCategory } from './types';

export default function QuickAdd({ onClose, onSave, onAdvanced, categories, initialCategories = [], simple = false }: {
  onClose: () => void;
  onSave: (entry: VaultEntry) => Promise<void>;
  onAdvanced: (entry: VaultEntry) => void;
  categories: VaultCategory[];
  initialCategories?: string[];
  simple?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [showCategories, setShowCategories] = useState(initialCategories.length > 0);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function entry(): VaultEntry {
    return { ...blankEntry(), title: title.trim(), username: username.trim(), password, categories: selectedCategories,
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
    <section className="sheet quick-sheet" role="dialog" aria-modal="true" aria-label="Passwort hinzufügen">
      <header className="sheet-header"><KeyRound size={20}/><h2>{simple ? 'Passwort speichern' : 'Schnell speichern'}</h2><button className="icon-btn" type="button" onClick={onClose} aria-label="Schließen"><X size={19}/></button></header>
      <form className="editor-form" onSubmit={e => void submit(e)}>
        <p className="input-help">{simple ? 'Trage nur die Angaben ein, die du brauchst. Alles Weitere ist freiwillig.' : 'In wenigen Sekunden einen Zugang anlegen. Weitere Angaben kannst du später ergänzen.'}</p>
        <label>{simple ? '1. Wofür ist das Passwort?' : 'Name / Dienst'}<input autoFocus placeholder={simple ? 'z. B. Router, E-Mail oder Netflix' : 'z. B. E-Mail, Bank, WLAN'} value={title} maxLength={120} onChange={e => setTitle(e.target.value)}/></label>
        <label>{simple ? '2. Benutzername (falls vorhanden)' : 'Benutzername'}<input autoComplete="off" placeholder="z. B. admin oder deine E-Mail" value={username} onChange={e => setUsername(e.target.value)}/></label>
        <label>{simple ? '3. Passwort' : 'Passwort'}<div className="quick-secret">
          <input autoComplete="new-password" type={visible ? 'text' : 'password'} value={password} placeholder="Passwort" onChange={e => setPassword(e.target.value)}/>
          <button type="button" className="icon-btn" onClick={() => setVisible(!visible)} aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'} title={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          {!simple && <button type="button" className="icon-btn" onClick={() => { setPassword(generateStrongPassword()); setVisible(true); }} title="Sicheres Passwort erstellen"><Sparkles size={18}/></button>}
        </div></label>
        {simple && <button className="quick-generate-action" type="button"
          onClick={() => { setPassword(generateStrongPassword()); setVisible(false); }}>
          <Sparkles size={19}/> Sicheres Passwort automatisch erstellen
        </button>}
        {simple && <button type="button" className="quick-optional-action" aria-expanded={showCategories}
          onClick={() => setShowCategories(current => !current)}>
          {showCategories ? 'Kategorien ausblenden' : selectedCategories.length ? 'Kategorie ändern' : 'Kategorie zuordnen (freiwillig)'}
        </button>}
        {(!simple || showCategories) && <CategoryPicker compact available={categories} selected={selectedCategories} onChange={setSelectedCategories}/>}
        {error && <p className="error-box" role="alert">{error}</p>}
        <div className="sheet-actions">{!simple && <button type="button" className="secondary-btn" onClick={() => { onAdvanced(entry()); onClose(); }}><Pencil size={16}/> Mehr Felder</button>}<button type="submit" className="primary-btn" disabled={busy}><Check size={18}/> {simple ? 'Passwort speichern' : 'Sicher speichern'}</button></div>
      </form>
    </section>
  </div>;
}
