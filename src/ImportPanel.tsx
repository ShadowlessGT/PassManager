import { useState } from 'react';
import { nativePasswordSafeSupported, openEncryptedPasswordSafe, mapPasswordSafeDatabase } from './passwordSafeDb';
import type { ChangeEvent } from 'react';
import { ArrowDownToLine, Check, FileSpreadsheet, ShieldCheck, X } from 'lucide-react';
import type { VaultEntry } from './types';
import { loadImportFile, skipDuplicates } from './importer';
import type { ImportPreview } from './importer';

const IMPORT_SOURCES = [
  ['Google Passwortmanager', 'CSV-Export aus Chrome bzw. Google Passwortmanager'],
  ['Password Safe', 'Verschlüsselte .db-Datenbank mit bisherigem Master-Passwort direkt auf Android öffnen oder CSV importieren'],
  ['iCloud Schlüsselbund', 'CSV-Export aus Apple Passwörter / Safari'],
  ['Bitwarden', 'Unverschlüsselten CSV-Export wählen, nicht JSON mit Kryptografie'],
  ['KeePass', 'Als CSV exportieren – .kdbx ist hier nicht direkt entschlüsselbar'],
  ['1Password', 'CSV-Export verwenden – verschlüsselte .1pux nicht direkt importierbar'],
  ['Samsung Pass', 'Falls verfügbar als CSV exportieren'],
  ['Dashlane', 'CSV-Export verwenden'],
  ['Enpass', 'CSV-Export verwenden'],
  ['Keeper', 'CSV-Export verwenden'],
  ['LastPass', 'CSV-Export verwenden'],
  ['NordPass', 'CSV-Export verwenden'],
  ['Proton Pass', 'CSV-Export verwenden'],
  ['RoboForm', 'CSV-Export verwenden'],
  ['Andere App', 'Jede App, die eine CSV- oder XLSX-Datei exportieren kann']
] as const;

type Props = {
  existing: VaultEntry[];
  onClose: () => void;
  onImport: (newEntries: VaultEntry[]) => Promise<void>;
};

export default function ImportPanel({ existing, onClose, onImport }: Props) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [skipExisting, setSkipExisting] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('Password Safe');
  const [sourceMaster, setSourceMaster] = useState('');
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([]);
  const [allowPartial, setAllowPartial] = useState(false);

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    setPreview(null);
    setSourceWarnings([]);
    setAllowPartial(false);
    setError('');
    if (!selected) return;
    setBusy(true);
    try { setPreview(await loadImportFile(selected)); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  async function importEncryptedPasswordSafe() {
    if (!nativePasswordSafeSupported()) return;
    const password = sourceMaster;
    setSourceMaster('');
    setPreview(null);
    setError('');
    setSourceWarnings([]);
    setAllowPartial(false);
    setBusy(true);
    try {
      const decrypted = await openEncryptedPasswordSafe(password);
      const mapped = mapPasswordSafeDatabase(decrypted);
      setPreview({
        entries: mapped.entries,
        skipped: mapped.skippedRows,
        headers: mapped.schema.flatMap(table => table.columns),
        source: 'Password Safe (.db / SQLCipher 4)'
      });
      setSourceWarnings(mapped.warnings);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Entschlüsselung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  const checked = preview ? skipDuplicates(existing, preview.entries) : null;
  const toImport = preview ? (skipExisting ? checked!.fresh : preview.entries) : [];

  async function importNow() {
    if (!preview || toImport.length === 0 || (sourceWarnings.length > 0 && !allowPartial)) return;
    setBusy(true); setError('');
    try { await onImport(toImport); setPreview(null); onClose(); }
    catch (reason) { setError((reason as Error).message || 'Import fehlgeschlagen.'); }
    finally { setBusy(false); }
  }

  return <div className="overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="sheet import-sheet" role="dialog" aria-modal="true" aria-label="Passwörter importieren">
      <header className="sheet-header"><FileSpreadsheet size={22}/><h2>Passwörter importieren</h2><button className="icon-btn" onClick={onClose} aria-label="Schließen"><X size={20}/></button></header>
      <div className="editor-form">
        <div className="import-source-grid" role="group" aria-label="Passwortmanager auswählen">
          {IMPORT_SOURCES.map(([name]) =>
            <button key={name} type="button" aria-pressed={selectedSource === name}
              className={selectedSource === name ? 'import-source active' : 'import-source'}
              onClick={() => setSelectedSource(name)}>{name}</button>
          )}
        </div>
        <p className="settings-note"><strong>{selectedSource}:</strong> {IMPORT_SOURCES.find(([name]) => name === selectedSource)?.[1]}</p>
        <div className="info-panel"><ShieldCheck size={22}/><p>Die Datei wird ausschließlich lokal eingelesen. Klartextdateien werden nicht an Firebase oder einen Server übertragen. Bestätigte Einträge werden mit deinem Master-Schlüssel verschlüsselt gespeichert.</p></div>
        {selectedSource === 'Password Safe' && <div className="legacy-db-import">
          <strong>Verschlüsselte Password-Safe-Datenbank (.db)</strong>
          {nativePasswordSafeSupported() ? <>
            <p className="settings-note">Die Datenbank wird ausschließlich lokal mit SQLCipher geöffnet. Gib hier das bisherige Password-Safe-Master-Passwort ein (nicht dein Parola-Passwort). Das Passwort wird nicht gespeichert oder hochgeladen.</p>
            <label>Master-Passwort der alten Datenbank
              <input type="password" autoComplete="off" value={sourceMaster}
                onChange={event => setSourceMaster(event.target.value)}
                placeholder="Passwort aus Password Safe" disabled={busy}/>
            </label>
            <button type="button" className="secondary-btn" disabled={busy || !sourceMaster}
              onClick={() => void importEncryptedPasswordSafe()}>
              <ArrowDownToLine size={17}/> Verschlüsselte .db-Datei auswählen und entsperren
            </button>
          </> : <p className="settings-note">
            Direkter verschlüsselter DB-Import ist zunächst nur in der Android-App verfügbar.
            Auf diesem Gerät kannst du weiter CSV oder XLSX importieren.
          </p>}
        </div>}
        <label className="import-drop">Exportdatei von {selectedSource} auswählen
          <input aria-label="Datei auswählen" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => void readFile(e)} disabled={busy}/>
          <small>CSV / XLSX: maximal 2 MB und 1000 Einträge. Verschlüsselte Fremdformate benötigen vorher einen Export in der Quell-App.</small>
        </label>
        {busy && <p className="settings-note">Datei wird geprüft...</p>}
        {error && <p className="error-box" role="alert">{error}</p>}
        {preview && <>
          <div className="import-stats"><h3>Vorschau: {preview.source}</h3><span>{preview.entries.length} erkannte Einträge</span></div>
          <p className="settings-note">{preview.skipped} unvollständige Zeilen übersprungen. {checked!.duplicates} mögliche Dubletten (gleicher Name, Login und Website).</p>
          <label className="check-line"><input type="checkbox" checked={skipExisting} onChange={e => setSkipExisting(e.target.checked)}/> <span>Mögliche Dubletten überspringen</span></label>
          <div className="import-preview">
            {preview.entries.slice(0, 8).map(item => <div className="import-preview-row" key={item.id}>
              <strong>{item.title}</strong>
              <small>{item.username || item.email || 'Ohne Benutzername'}</small>
              <span>Passwörter verborgen</span>
            </div>)}
            {preview.entries.length > 8 && <p className="settings-note">… und {preview.entries.length - 8} weitere Einträge</p>}
          </div>
          <p className="settings-note">Bitte prüfe nach dem Import stichprobenartig Felder und Zuordnungen. Nicht erkannte Spalten werden als individuelle Felder übernommen.</p>
          {sourceWarnings.length > 0 && <div className="master-warning" role="alert">
            <strong>Der DB-Import ist möglicherweise unvollständig:</strong>
            {sourceWarnings.map((warning, i) => <p key={i}>{warning}</p>)}
            <label className="check-line">
              <input type="checkbox" checked={allowPartial} onChange={e => setAllowPartial(e.target.checked)}/>
              <span>Ich habe die Einschränkungen verstanden und möchte nur die erkannten Daten importieren.</span>
            </label>
          </div>}
        </>}
        <div className="sheet-actions"><button className="secondary-btn" onClick={onClose}>Abbrechen</button>
          <button className="primary-btn" onClick={() => void importNow()} disabled={busy || toImport.length === 0 || (sourceWarnings.length > 0 && !allowPartial)}><ArrowDownToLine size={16}/> {toImport.length} sicher importieren <Check size={16}/></button>
        </div>
      </div>
    </section>
  </div>;
}
