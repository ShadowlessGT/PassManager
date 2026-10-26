import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { ArrowDownToLine, Check, FileSpreadsheet, ShieldCheck, X } from 'lucide-react';
import type { VaultEntry } from './types';
import { loadImportFile, skipDuplicates } from './importer';
import type { ImportPreview } from './importer';

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

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = '';
    setPreview(null);
    setError('');
    if (!selected) return;
    setBusy(true);
    try { setPreview(await loadImportFile(selected)); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  const checked = preview ? skipDuplicates(existing, preview.entries) : null;
  const toImport = preview ? (skipExisting ? checked!.fresh : preview.entries) : [];

  async function importNow() {
    if (!preview || toImport.length === 0) return;
    setBusy(true); setError('');
    try { await onImport(toImport); setPreview(null); onClose(); }
    catch (reason) { setError((reason as Error).message || 'Import fehlgeschlagen.'); }
    finally { setBusy(false); }
  }

  return <div className="overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="sheet import-sheet" role="dialog" aria-modal="true" aria-label="Passwörter importieren">
      <header className="sheet-header"><FileSpreadsheet size={22}/><h2>CSV / Excel importieren</h2><button className="icon-btn" onClick={onClose} aria-label="Schließen"><X size={20}/></button></header>
      <div className="editor-form">
        <div className="info-panel"><ShieldCheck size={22}/><p>Die Datei wird ausschließlich lokal eingelesen. Klartextdateien werden nicht an Firebase oder einen Server übertragen. Bestätigte Einträge werden mit deinem Master-Schlüssel verschlüsselt gespeichert.</p></div>
        <label className="import-drop">CSV- oder XLSX-Datei auswählen
          <input aria-label="Datei auswählen" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => void readFile(e)} disabled={busy}/>
          <small>Bis 2 MB / 1000 Einträge pro Import. Erste Tabellenregisterkarte bei Excel.</small>
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
        </>}
        <div className="sheet-actions"><button className="secondary-btn" onClick={onClose}>Abbrechen</button>
          <button className="primary-btn" onClick={() => void importNow()} disabled={busy || toImport.length === 0}><ArrowDownToLine size={16}/> {toImport.length} sicher importieren <Check size={16}/></button>
        </div>
      </div>
    </section>
  </div>;
}
