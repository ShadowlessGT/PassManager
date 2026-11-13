import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowDownToLine, ArrowUpToLine, FileLock2, ShieldCheck, X } from 'lucide-react';
import { decryptVault, deriveVaultKey } from './crypto';
import type { EncryptedEnvelope } from './crypto';
import { parseEncryptedBackup, validateImportedVault } from './vaultTransfer';
import type { VaultData, VaultEntry } from './types';
import { skipDuplicates } from './importer';

type Props = {
  existing: VaultEntry[];
  onClose: () => void;
  onExport: (format: 'encrypted' | 'csv') => Promise<void>;
  onImportVault: (vault: VaultData) => Promise<void>;
};

export default function BackupPanel({ existing, onClose, onExport, onImportVault }: Props) {
  const [envelope, setEnvelope] = useState<EncryptedEnvelope | null>(null);
  const [password, setPassword] = useState('');
  const [preview, setPreview] = useState<VaultData | null>(null);
  const [skipExisting, setSkipExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function readBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setEnvelope(null); setPreview(null); setPassword(''); setError(''); setNotice('');
    if (!file) return;
    if (file.size > 30_000_000) { setError('Backup-Datei zu groß (maximal 30 MB).'); return; }
    setBusy(true);
    try {
      setEnvelope(parseEncryptedBackup(await file.text()));
      setNotice('Verschlüsseltes Backup erkannt. Bitte das Master-Passwort der Sicherung eingeben.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function unlockBackup(event: FormEvent) {
    event.preventDefault();
    if (!envelope || !password) return;
    setBusy(true); setError('');
    try {
      const derived = await deriveVaultKey(password, envelope.salt);
      const vault = validateImportedVault(await decryptVault(envelope, derived));
      setPreview(vault);
      setPassword('');
      setNotice('Passwort bestätigt. Die Einträge werden nur nach deiner Bestätigung importiert.');
    } catch {
      setError('Backup lässt sich nicht entschlüsseln. Master-Passwort oder Datei prüfen.');
    } finally { setBusy(false); }
  }

  const deduplicated = preview ? skipDuplicates(existing, preview.entries) : null;
  const incoming = preview ? (skipExisting ? deduplicated!.fresh : preview.entries) : [];

  async function importNow() {
    if (!preview || !incoming.length) return;
    setBusy(true); setError('');
    try {
      await onImportVault({ ...preview, entries: incoming });
      setPreview(null); setEnvelope(null); setPassword('');
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Backup-Import fehlgeschlagen.');
    } finally { setBusy(false); }
  }

  async function exportNow(format: 'encrypted' | 'csv') {
    setBusy(true); setError(''); setNotice('');
    try {
      await onExport(format);
      setNotice(format === 'encrypted' ? 'Verschlüsseltes Backup gespeichert.' : 'CSV-Export erstellt.');
    } catch (e) {
      setError((e as Error).message || 'Export fehlgeschlagen.');
    } finally { setBusy(false); }
  }

  return <div className="overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section className="sheet import-sheet" role="dialog" aria-modal="true" aria-label="Parola Sicherung und Export">
      <header className="sheet-header">
        <FileLock2 size={22}/>
        <h2>Sichern, exportieren und wiederherstellen</h2>
        <button className="icon-btn" type="button" onClick={onClose} disabled={busy} aria-label="Schließen"><X size={20}/></button>
      </header>
      <div className="editor-form">
        <div className="info-panel"><ShieldCheck size={21}/>
          <p>Empfohlen: Das <strong>.parola-Backup</strong> enthält den vollständigen verschlüsselten Tresor, inklusive Kategorien und Bildern. Es kann nur mit dem Master-Passwort der Sicherung entschlüsselt werden.</p>
        </div>
        <div className="cloud-buttons">
          <button className="primary-btn" type="button" disabled={busy} onClick={() => void exportNow('encrypted')}>
            <ArrowUpToLine size={17}/> Verschlüsseltes Backup (.parola)
          </button>
          <button className="secondary-btn" type="button" disabled={busy} onClick={() => void exportNow('csv')}>
            <ArrowUpToLine size={17}/> CSV für andere Passwortmanager
          </button>
        </div>
        <p className="master-warning"><strong>CSV enthält Zugangsdaten im Klartext.</strong> Exportiere CSV nur bei Bedarf und speichere sie nicht in einem öffentlichen oder synchronisierten Ordner. Bilder und Passwortverläufe werden nur im verschlüsselten Backup vollständig übernommen.</p>
        <div className="settings-heading"><span className="settings-icon"><ArrowDownToLine size={20}/></span><div><h3>Parola-Backup importieren</h3>
          <p>Eine eigene verschlüsselte Sicherung von einem anderen Gerät einlesen.</p></div></div>
        <label className="import-drop">Verschlüsselte .parola-Datei auswählen
          <input type="file" accept=".parola,application/json" onChange={e => void readBackup(e)} disabled={busy}/>
        </label>
        {envelope && !preview && <form onSubmit={e => void unlockBackup(e)}>
          <label>Master-Passwort dieser Sicherung
            <input type="password" autoComplete="off" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort der Quelldatenbank"/>
          </label>
          <button type="submit" className="primary-btn" disabled={busy || !password}>Backup lokal entschlüsseln und prüfen</button>
        </form>}
        {preview && <>
          <div className="import-stats"><h3>{preview.entries.length} verschlüsselte Einträge erkannt</h3>
            <span>{deduplicated!.duplicates} mögliche Dubletten</span></div>
          <label className="check-line"><input type="checkbox" checked={skipExisting} onChange={e => setSkipExisting(e.target.checked)}/>
            <span>Dubletten überspringen (empfohlen)</span></label>
          <div className="import-preview">
            {preview.entries.slice(0, 8).map((entry, i) => <div className="import-preview-row" key={entry.id + ':' + i}>
              <strong>{entry.title}</strong>
              <small>{entry.username || entry.email || 'Ohne Benutzername'}</small>
              <span>Passwörter verborgen</span>
            </div>)}
          </div>
          <p className="settings-note">Import ergänzt den aktuellen Tresor. Er überschreibt keine bestehenden Einträge und lädt nichts in die Cloud hoch.</p>
          <button className="primary-btn" type="button" disabled={busy || !incoming.length} onClick={() => void importNow()}>
            <ArrowDownToLine size={17}/> {incoming.length} Einträge importieren
          </button>
        </>}
        {notice && <p className="settings-note" role="status">{notice}</p>}
        {error && <p className="error-box" role="alert">{error}</p>}
        <div className="sheet-actions"><button className="secondary-btn" type="button" disabled={busy} onClick={onClose}>Schließen</button></div>
      </div>
    </section>
  </div>;
}
