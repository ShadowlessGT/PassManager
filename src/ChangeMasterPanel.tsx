import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, ShieldAlert, X } from 'lucide-react';
import { validateNewMasterPassword } from './masterPassword';

type Props = {
  onClose: () => void;
  onChange: (oldPassword: string, nextPassword: string) => Promise<void>;
};

export default function ChangeMasterPanel({ onClose, onChange }: Props) {
  const [previous, setPrevious] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validateNewMasterPassword(next, confirm);
    if (validation) { setError(validation); return; }
    if (previous === next) { setError('Das neue Master-Passwort muss sich unterscheiden.'); return; }
    setBusy(true); setError('');
    try {
      await onChange(previous, next);
      setPrevious(''); setNext(''); setConfirm('');
      onClose();
    } catch {
      setError('Master-Passwort konnte nicht geändert werden. Altes Passwort oder Speicher prüfen.');
    } finally { setBusy(false); }
  }

  return <div className="overlay" role="presentation">
    <section className="sheet import-sheet" role="dialog" aria-modal="true" aria-label="Master-Passwort ändern">
      <header className="sheet-header"><KeyRound size={22}/><h2>Master-Passwort ändern</h2>
        <button type="button" className="icon-btn" disabled={busy} onClick={onClose} aria-label="Schließen"><X size={20}/></button>
      </header>
      <form className="editor-form" onSubmit={e => void submit(e)}>
        <p className="settings-note">Das bisherige Master-Passwort wird geprüft. Der Tresor wird lokal mit einem neuen Schlüssel und zufälligem Salt verschlüsselt. Nach der Änderung musst du die Biometrie erneut aktivieren und Cloud-Backups aktualisieren.</p>
        <div className="info-panel"><ShieldAlert size={20}/><p>Alte Sicherungsdateien bleiben mit dem bisherigen Passwort entschlüsselbar. Bewahre sie entsprechend geschützt auf.</p></div>
        <label>Bisheriges Master-Passwort
          <input type="password" autoComplete="current-password" value={previous} required onChange={e => setPrevious(e.target.value)}/>
        </label>
        <label>Neues Master-Passwort
          <input type="password" autoComplete="new-password" value={next} required onChange={e => setNext(e.target.value)}/>
        </label>
        <label>Neues Master-Passwort wiederholen
          <input type="password" autoComplete="new-password" value={confirm} required onChange={e => setConfirm(e.target.value)}/>
        </label>
        {error && <p className="error-box" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="secondary-btn" disabled={busy} onClick={onClose}>Abbrechen</button>
          <button type="submit" className="primary-btn" disabled={busy || !previous || !next || !confirm}>Master-Passwort ändern</button>
        </div>
      </form>
    </section>
  </div>;
}
