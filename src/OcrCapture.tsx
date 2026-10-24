import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Script, TextRecognition } from '@capacitor-mlkit/text-recognition';
import { ArrowLeft, Camera as CameraIcon, FileImage, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { VaultEntry } from './types';
import { ocrToNewEntry, parseRecognizedCredentials } from './ocr';
import type { OcrDraft } from './ocr';

export default function OcrCapture({onClose,onReview}: {onClose:()=>void;onReview:(entry:VaultEntry)=>void}) {
  const [draft, setDraft] = useState<OcrDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  async function analyze(source: 'gallery'|'camera') {
    setBusy(true); setError(''); setDraft(null); setShowRaw(false);
    let temporary: string | null = null;
    try {
      const media = source === 'camera'
        ? await Camera.takePhoto({quality:95, saveToGallery:false})
        : (await Camera.chooseFromGallery({quality:95, allowMultipleSelection:false})).results[0];
      if (!media?.uri) return;
      let path = media.uri;
      // Photo picker may return a content:// URI. Copy it only to the app's
      // temporary cache if necessary. Delete the temp image after recognition.
      if (!path.startsWith('file://') && !path.startsWith('/')) {
        const sourceBytes = await Filesystem.readFile({path});
        temporary = 'passmanager-ocr-' + crypto.randomUUID() + '.jpg';
        await Filesystem.writeFile({path:temporary, directory:Directory.Cache, data:sourceBytes.data});
        path = (await Filesystem.getUri({path:temporary,directory:Directory.Cache})).uri;
      }
      const result = await TextRecognition.processImage({path,script:Script.Latin});
      if (!result.text.trim()) throw new Error('Auf dem Bild wurde kein lesbarer Text gefunden.');
      setDraft(parseRecognizedCredentials(result.text));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Bild konnte nicht lokal analysiert werden.');
    } finally {
      if (temporary) await Filesystem.deleteFile({path:temporary,directory:Directory.Cache}).catch(() => {});
      setBusy(false);
    }
  }

  function change(key: Exclude<keyof OcrDraft, 'raw'>, value: string) {
    setDraft(previous => previous ? {...previous,[key]: key === 'pin' ? value.replace(/\D/g,'') : value} : previous);
  }

  return <div className="overlay" role="presentation" onMouseDown={e => {if(e.target===e.currentTarget)onClose();}}>
    <section className="sheet ocr-sheet" role="dialog" aria-modal="true" aria-label="Zugang aus Bild erkennen">
      <header className="sheet-header"><button className="icon-btn" type="button" onClick={onClose} aria-label="Schließen"><ArrowLeft size={20}/></button><h2>Daten aus Bild erkennen</h2><button className="icon-btn" type="button" onClick={onClose} aria-label="Schließen"><X size={20}/></button></header>
      <div className="editor-form">
        <p className="input-help">Foto jederzeit in der Galerie aufnehmen oder speichern und später hier auswählen. OCR wird lokal auf deinem Android-Gerät ausgeführt.</p>
        <div className="info-panel"><ShieldCheck size={20}/><p>Das Bild wird nicht an Firebase hochgeladen. Die erkannten Daten bleiben nur im temporären Formular, bis du einen Eintrag ausdrücklich übernimmst und speicherst.</p></div>
        {isNative ? <div className="ocr-buttons">
          <button className="secondary-btn" type="button" onClick={() => void analyze('gallery')} disabled={busy}><FileImage size={18}/> Aus Galerie wählen</button>
          <button className="secondary-btn" type="button" onClick={() => void analyze('camera')} disabled={busy}><CameraIcon size={18}/> Foto machen</button>
        </div> : <p className="settings-note">Automatische Texterkennung ist in der installierten Android-Version verfügbar. Im Browser lässt sich hier kein Screenshot lokal per ML Kit auslesen.</p>}
        {busy && <p className="settings-note">Bild wird auf diesem Gerät analysiert...</p>}
        {error && <p className="error-box" role="alert">{error}</p>}
        {draft && <>
          <div className="form-section-title">Erkannte Daten kontrollieren</div>
          <p className="input-help">OCR kann Zeichen falsch erkennen. Besonders Passwörter, 0/O und 1/l bitte manuell abgleichen. Erst nach deinem Klick werden Daten in den Editor übernommen.</p>
          {([{key:'title',label:'Name / Dienst'},{key:'username',label:'Benutzername'},{key:'password',label:'Passwort'},{key:'email',label:'E-Mail'},{key:'website',label:'Website'},{key:'pin',label:'PIN'}] as const).map(field =>
            <label key={field.key}>{field.label}<input
              type={field.key==='password'||field.key==='pin'?'password':'text'}
              autoComplete="off"
              value={draft[field.key]}
              inputMode={field.key==='pin'?'numeric':undefined}
              onChange={e=>change(field.key,e.target.value)}/></label>)}
          <button type="button" className="text-btn" onClick={()=>setShowRaw(!showRaw)}>{showRaw?'Erkannten Rohtext ausblenden':'Erkannten Rohtext lokal anzeigen'}</button>
          {showRaw && <textarea className="ocr-raw" readOnly rows={8} aria-label="Erkannter Rohtext" value={draft.raw}/>}
          <button type="button" className="primary-btn full" onClick={()=>{onReview(ocrToNewEntry(draft));onClose();}}><Sparkles size={17}/> Im Passworteditor überprüfen</button>
        </>}
      </div>
    </section>
  </div>;
}
