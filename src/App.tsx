import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  ArrowDownToLine, ArrowLeft, ArrowUpToLine, Check, ChevronRight, Cloud,
  Copy, Edit3, ExternalLink, Eye, EyeOff, Fingerprint, Folder,
  ImagePlus, KeyRound, LockKeyhole, LogOut, Mail, Plus, Search,
  Settings2, ShieldCheck, Sparkles, Star, Trash2, UserRound, UsersRound,
  X, Globe2, Shield, CalendarClock, BarChart3, Camera as CameraIcon, SlidersHorizontal
} from 'lucide-react';
import { newVault, ENTRY_FIELD_PRESETS, FIELD_KINDS, makeField, validateEntryFields } from './types';
import type { VaultData, VaultEntry, EntryField, VaultCategory } from './types';
import ImportPanel from './ImportPanel';
import LicensePanel from './LicensePanel';
import InsightsPanel from './InsightsPanel';
import QuickAdd from './QuickAdd';
import OcrCapture from './OcrCapture';
import { generateStrongPassword } from './passwordGenerator';
import { validateNewMasterPassword, masterPasswordStrength } from './masterPassword';
import { logActivity, trackPasswordHistory } from './insights';
import { App as NativeApp } from '@capacitor/app';
import CategoryPicker from './CategoryPicker';
import CategoryManager from './CategoryManager';
import { categoriesForVault, ensureEntryCategories, upsertCategory, removeCategory } from './categories';
import { loadPreferences, savePreferences, shouldLockAfterBackground, shouldLockAfterIdle, LOCK_OPTIONS, IDLE_OPTIONS } from './preferences';
import type { UserPreferences } from './preferences';
import { resolveAppearance, applyResolvedAppearance, APPEARANCE_CHOICES } from './theme';
import type { ActivityKind } from './types';
import { Clipboard } from '@capacitor/clipboard';
import { decryptVault, deriveVaultKey, encryptVault, newSalt } from './crypto';
import type { EncryptedEnvelope } from './crypto';
import { verifyCloudVault, vaultRevision } from './cloudSafety';
import { readLocalVault, writeLocalVault, readPreviousLocalVault, replaceVaultWithVerifiedCloudCopy, restorePreviousLocalVault } from './storage';
import { biometricIsEnabled, deviceUnlockSupported, disableDeviceUnlock, enableDeviceUnlock, unlockWithDevice } from './device';
import { cloudConfigured, cloudDownload, cloudEmail, cloudSignIn, cloudSignOut, cloudUpload, onCloudEmailChange } from './cloud';

type Tab = 'vault' | 'favorites' | 'categories' | 'people' | 'insights' | 'settings';
const NAV: { id: Tab; label: string; icon: typeof KeyRound }[] = [
  { id: 'vault', label: 'Tresor', icon: KeyRound },
  { id: 'favorites', label: 'Favoriten', icon: Star },
  { id: 'categories', label: 'Kategorien', icon: Folder },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'settings', label: 'Einstellungen', icon: Settings2 }
];

const generatePassword = generateStrongPassword;

function safeUrl(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.includes('://') ? value : 'https://' + value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

function getInitials(title: string): string {
  return title.trim().slice(0, 2).toUpperCase() || 'PW';
}

type EditorProps = {
  entry: VaultEntry;
  categories: VaultCategory[];
  people: string[];
  simple: boolean;
  onClose: () => void;
  onSave: (entry: VaultEntry) => Promise<void>;
};

function EntryEditor({ entry, categories, people, simple, onClose, onSave }: EditorProps) {
  const [draft, setDraft] = useState<VaultEntry>({ ...entry, images: [...entry.images], categories: [...entry.categories], fields: (entry.fields ?? []).map(field => ({...field})) });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update<K extends keyof VaultEntry>(key: K, value: VaultEntry[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
  }

  function updateField(id: string, patch: Partial<EntryField>) {
    setDraft(previous => ({
      ...previous,
      fields: (previous.fields ?? []).map(field => field.id === id ? { ...field, ...patch, updatedAt: Date.now() } : field)
    }));
  }

  function addField(label: string, kind: EntryField['kind']) {
    setDraft(previous => ({
      ...previous,
      fields: [...(previous.fields ?? []), makeField(label, kind)]
    }));
  }

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selected.length) return;
    if (selected.length + draft.images.length > 3) {
      setError('Maximal 3 Bilder pro Eintrag.');
      return;
    }
    if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 500_000)) {
      setError('Nur JPG, PNG oder WebP bis 500 KB pro Bild erlaubt.');
      return;
    }
    try {
      const images = await Promise.all(selected.map(fileAsDataUrl));
      setDraft(previous => ({ ...previous, images: [...previous.images, ...images] }));
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) { setError('Bitte einen Namen eingeben.'); return; }
    const fields = draft.fields ?? [];
    const fieldError = validateEntryFields(fields);
    if (fieldError) { setError(fieldError); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        categories: draft.categories,
        person: draft.person.trim(),
        updatedAt: Date.now(),
        passwordChangedAt: draft.passwordChangedAt !== entry.passwordChangedAt
          ? draft.passwordChangedAt
          : (draft.password !== entry.password
            ? (draft.password ? Date.now() : undefined)
            : draft.passwordChangedAt)
      });
      onClose();
    } catch (reason) {
      setError((reason as Error).message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Passwort bearbeiten">
        <header className="sheet-header">
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Schließen"><ArrowLeft size={20}/></button>
          <h2>{entry.title ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Schließen"><X size={20}/></button>
        </header>
        <form className="editor-form" onSubmit={submit}>
          <div className="form-section-title">Grundinformationen</div>
          <label>Name <span className="required">*</span><input autoFocus value={draft.title} onChange={e => update('title', e.target.value)} placeholder="z. B. Netflix, Gmail, WLAN..." maxLength={120}/></label>
          {!simple && <label>Beschreibung<input value={draft.description} onChange={e => update('description', e.target.value)} placeholder="Wofür wird dieser Zugang verwendet?"/></label>}
          <div className="form-section-title">Zugangsdaten</div>
          <label>Benutzername<input autoComplete="off" value={draft.username} onChange={e => update('username', e.target.value)} placeholder="Benutzername"/></label>
          {!simple && <label>E-Mail-Adresse<input autoComplete="off" inputMode="email" value={draft.email} onChange={e => update('email', e.target.value)} placeholder="name@beispiel.de"/></label>}
          <label>Passwort
            <div className="field-with-actions">
              <input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={draft.password} onChange={e => update('password', e.target.value)} placeholder="Passwort"/>
              <button className="field-action" type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Passwort anzeigen">{showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}</button>
              <button className="field-action" type="button" title="Sicheres Passwort generieren" onClick={() => { update('password', generatePassword()); setShowPassword(true); }}><Sparkles size={19}/></button>
            </div>
          </label>
          {!simple && <>
          <label>Homepage / URL<input value={draft.website} onChange={e => update('website', e.target.value)} placeholder="https://beispiel.de"/></label>
          <label className="check-line"><input type="checkbox" checked={Boolean(draft.keepPasswordHistory)}
            onChange={e => update('keepPasswordHistory', e.target.checked)}/>
            <span>Frühere Passwörter verschlüsselt aufbewahren (max. 10, optional)</span>
          </label>
          <label>Passwort vergeben / zuletzt geändert am
            <input type="date" value={draft.passwordChangedAt ? new Date(draft.passwordChangedAt).toISOString().slice(0, 10) : ''} max={new Date().toISOString().slice(0, 10)}
              onChange={e => update('passwordChangedAt', e.target.value ? new Date(e.target.value + 'T12:00:00').getTime() : undefined)} />
          </label>
          <div className="form-section-title">Weitere Felder</div>
          <p className="input-help">Zusätzliche Felder kannst du frei benennen und als Text, PIN, Passwort, Adresse, E-Mail oder Link behandeln lassen.</p>
          {(draft.fields ?? []).map(field => <div className="custom-field-row" key={field.id}>
            <div className="custom-field-toolbar">
              <input aria-label="Feldname" value={field.label} placeholder="Feldname" maxLength={100} onChange={e => updateField(field.id, {label: e.target.value})} />
              <select aria-label={'Feldtyp für ' + field.label} value={field.kind} onChange={e => updateField(field.id, {kind: e.target.value as EntryField['kind']})}>{FIELD_KINDS.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
              <button type="button" className="field-remove" onClick={() => update('fields', (draft.fields ?? []).filter(item => item.id !== field.id))} aria-label="Feld entfernen"><Trash2 size={16}/></button>
            </div>
            {field.kind === 'multiline'
              ? <textarea value={field.value} rows={3} placeholder="Mehrzeiliger Wert" onChange={e => updateField(field.id, {value: e.target.value})}/>
              : <div className="field-with-actions">
                  <input
                    aria-label={field.label}
                    value={field.value}
                    type={field.kind === 'secret' || field.kind === 'pin' ? (showPassword ? 'text' : 'password') : field.kind === 'email' ? 'email' : field.kind === 'url' ? 'url' : 'text'}
                    inputMode={field.kind === 'pin' || field.kind === 'number' ? 'numeric' : undefined}
                    autoComplete="off"
                    placeholder={field.kind === 'pin' ? 'Nur Ziffern' : field.kind === 'secret' ? 'Verdeckter Wert' : 'Wert eingeben'}
                    onChange={e => updateField(field.id, { value: field.kind === 'pin' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value })}
                  />
                  {(field.kind === 'secret' || field.kind === 'pin') && <button type="button" className="field-action" onClick={() => setShowPassword(!showPassword)} aria-label="Geheime Felder anzeigen">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>}
                </div>}
          </div>)}
          {(draft.fields ?? []).length < 50 && <div className="field-buttons">
            <select aria-label="Vordefiniertes Feld hinzufügen" defaultValue="" onChange={e => {
              const preset = ENTRY_FIELD_PRESETS.find(item => item.label === e.target.value);
              if (preset) addField(preset.label, preset.kind);
              e.target.value = '';
            }}><option value="">+ Vordefiniertes Feld...</option>{ENTRY_FIELD_PRESETS.map(preset => <option key={preset.label} value={preset.label}>{preset.label}</option>)}</select>
            <button type="button" className="secondary-btn" onClick={() => addField('Neues Feld', 'text')}><Plus size={17}/> Eigenes Feld</button>
          </div>}
          <div className="form-section-title">Organisieren</div>
          <label>Person / Besitzer<input list="people-list" value={draft.person} onChange={e => update('person', e.target.value)} placeholder="z. B. Familie"/><datalist id="people-list">{people.map(person => <option key={person} value={person}/>)}</datalist></label>
          </>}
          <CategoryPicker available={categories} selected={draft.categories} onChange={names => update('categories',names)} compact={simple}/>
          {!simple && <>
          <label>Kommentare und Notizen<textarea value={draft.notes} onChange={e => update('notes', e.target.value)} rows={4} placeholder="Sicherheitsfragen, Hinweise, freie Notizen..."/></label>
          <div className="form-section-title">Bilder und Anhänge</div>
          <p className="input-help">Bilder werden zusammen mit dem gesamten Tresor verschlüsselt. Maximal 3 Bilder à 500 KB.</p>
          <div className="image-gallery">
            {draft.images.map((src, index) => <div className="image-tile" key={index}><img src={src} alt={'Anhang ' + (index + 1)}/><button type="button" aria-label="Bild entfernen" onClick={() => update('images', draft.images.filter((_, i) => i !== index))}><X size={14}/></button></div>)}
            {draft.images.length < 3 && <label className="image-picker"><ImagePlus size={25}/><span>Bild hinzufügen</span><input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={addImages}/></label>}
          </div>
          <label className="check-line"><input type="checkbox" checked={draft.favorite} onChange={e => update('favorite', e.target.checked)}/><span>Zu Favoriten hinzufügen</span></label>
          </>}
          {simple && <p className="input-help">Tipp: Unter Einstellungen kannst du jederzeit in den Experten-Modus wechseln, um zusätzliche Felder zu bearbeiten.</p>}
          {error && <p className="error-box" role="alert">{error}</p>}
          <div className="sheet-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Wird verschlüsselt...' : 'Sicher speichern'} <Check size={17}/></button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [data, setData] = useState<VaultData | null>(null);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [salt, setSalt] = useState('');
  const [master, setMaster] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showMaster, setShowMaster] = useState(false);
  const [gateError, setGateError] = useState('');
  const [working, setWorking] = useState(false);
  const [deviceSupported, setDeviceSupported] = useState(false);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [tab, setTab] = useState<Tab>('vault');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [reveal, setReveal] = useState<string[]>([]);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [notice, setNotice] = useState('');
  const [cloudUser, setCloudUser] = useState<string | null>(cloudEmail());
  const [cloudLoginEmail, setCloudLoginEmail] = useState('');
  const [cloudLoginPassword, setCloudLoginPassword] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [restoreCandidate, setRestoreCandidate] = useState<EncryptedEnvelope | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [previousBackupAvailable, setPreviousBackupAvailable] = useState(false);
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const dataRef = useRef<VaultData | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const lastActivity = useRef(Date.now());
  const hiddenSince = useRef<number | null>(null);
  useEffect(() => { savePreferences(preferences); }, [preferences]);
  useEffect(() => {
    // Follow Android's theme dynamically while no manual override is selected.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const synchronize = () => setSystemDark(media.matches);
    synchronize();
    media.addEventListener('change', synchronize);
    return () => media.removeEventListener('change', synchronize);
  }, []);
  useEffect(() => {
    applyResolvedAppearance(resolveAppearance(preferences.appearance, systemDark));
  }, [preferences.appearance, systemDark]);
  useEffect(() => {
    if (preferences.mode === 'simple' && !['vault','categories','settings'].includes(tab)) {
      setTab('vault'); setPersonFilter(null); setCategoryFilter(null);
    }
  }, [preferences.mode,tab]);

  useEffect(() => {
    void readPreviousLocalVault().then(saved => setPreviousBackupAvailable(Boolean(saved))).catch(() => {});
    void readLocalVault().then(saved => setHasVault(Boolean(saved)))
      .catch(() => setGateError('Lokaler Speicher konnte nicht geöffnet werden.'))
      .finally(() => setLoading(false));
    void deviceUnlockSupported().then(setDeviceSupported).catch(() => setDeviceSupported(false));
    void biometricIsEnabled().then(setDeviceEnabled).catch(() => setDeviceEnabled(false));
    return onCloudEmailChange(setCloudUser);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function lockVault() {
    dataRef.current = null;
    hiddenSince.current = null;
    setKey(null); setData(null); setSalt(''); setMaster(''); setConfirm('');
    setShowOCR(false); setShowQuickAdd(false);
    setSelectedId(null); setEditing(null); setReveal([]); setShowExtraDetails(false); setTab('vault');
    setCategoryFilter(null); setPersonFilter(null); setQuery('');
  }

  useEffect(() => {
    if (!data) return;
    const noteActivity = () => { if (hiddenSince.current === null) lastActivity.current = Date.now(); };
    const background = () => {
      if (hiddenSince.current === null) hiddenSince.current = Date.now();
      if (preferences.backgroundLockMs === 0) lockVault();
    };
    const foreground = () => {
      const away = hiddenSince.current;
      if (shouldLockAfterBackground(away, Date.now(), preferences.backgroundLockMs)) {
        hiddenSince.current = null;
        lockVault();
      } else {
        hiddenSince.current = null;
        lastActivity.current = Date.now();
      }
    };
    const onVisibility = () => { if (document.hidden) background(); else foreground(); };
    const idleTimer = window.setInterval(() => {
      // Background protection has its own separate timeout. Switching apps
      // must never be mistaken for foreground inactivity.
      if (hiddenSince.current === null && shouldLockAfterIdle(lastActivity.current, Date.now(), preferences.idleLockMs))
        lockVault();
    }, 3000);
    window.addEventListener('pointerdown', noteActivity);
    window.addEventListener('keydown', noteActivity);
    document.addEventListener('visibilitychange', onVisibility);
    let disposed = false;
    let nativeHandle: {remove:()=>Promise<void>} | undefined;
    void NativeApp.addListener('appStateChange', state => {
      if (disposed) return;
      if (state.isActive) foreground(); else background();
    }).then(handle => { if (disposed) void handle.remove(); else nativeHandle = handle; })
      .catch(() => { /* Browser also supports document visibility. */ });
    return () => {
      disposed = true;
      void nativeHandle?.remove();
      window.clearInterval(idleTimer);
      window.removeEventListener('pointerdown', noteActivity);
      window.removeEventListener('keydown', noteActivity);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [data !== null, preferences.backgroundLockMs, preferences.idleLockMs]);


  async function gateSubmit(event: FormEvent) {
    event.preventDefault();
    setGateError('');
    if (!master) { setGateError('Master-Passwort eingeben.'); return; }
    if (!hasVault) {
      const setupError = validateNewMasterPassword(master, confirm);
      if (setupError) { setGateError(setupError); return; }
    }
    setWorking(true);
    try {
      const stored = await readLocalVault();
      if (hasVault && !stored) throw new Error('Tresordatei wurde nicht gefunden.');
      const vaultSalt = stored?.salt ?? newSalt();
      const derived = await deriveVaultKey(master, vaultSalt);
      const clear = stored ? await decryptVault(stored, derived) : newVault();
      if (!stored) await writeLocalVault(await encryptVault(clear, derived, vaultSalt));
      hiddenSince.current = null;
      dataRef.current = clear;
      setKey(derived); setSalt(vaultSalt); setData(clear); setHasVault(true);
      setMaster(''); setConfirm(''); lastActivity.current = Date.now();
    } catch {
      setGateError('Entsperren fehlgeschlagen. Bitte Master-Passwort und Tresordaten prüfen.');
    } finally { setWorking(false); }
  }

  async function deviceUnlock() {
    setWorking(true); setGateError('');
    try {
      const stored = await readLocalVault();
      if (!stored) throw new Error('Kein Tresor vorhanden.');
      const derived = await unlockWithDevice();
      const clear = await decryptVault(stored, derived);
      hiddenSince.current = null;
      dataRef.current = clear;
      setKey(derived); setSalt(stored.salt); setData(clear); lastActivity.current = Date.now();
    } catch {
      setGateError('Geräteentsperrung fehlgeschlagen. Bitte Master-Passwort verwenden.');
    } finally { setWorking(false); }
  }


  async function mutateVault(transform: (current: VaultData) => VaultData): Promise<void> {
    const activeKey = key, activeSalt = salt;
    const task = writes.current.catch(() => {}).then(async () => {
      const current = dataRef.current;
      if (!current || !activeKey || !activeSalt) throw new Error('Tresor ist gesperrt.');
      const next = transform(current);
      const encrypted = await encryptVault(next, activeKey, activeSalt);
      await writeLocalVault(encrypted);
      // Locking the UI must not be undone by a pending write.
      if (dataRef.current !== null) { dataRef.current = next; setData(next); }
    });
    writes.current = task.catch(() => {});
    await task;
  }

  async function saveEntry(entry: VaultEntry) {
    let existed = false;
    await mutateVault(current => {
      const previous = current.entries.find(value => value.id === entry.id);
      existed = Boolean(previous);
      const replacement = trackPasswordHistory(previous, { ...entry, activity: previous?.activity ?? entry.activity });
      const withEntry = { ...current, entries: previous
        ? current.entries.map(value => value.id === entry.id ? replacement : value)
        : [replacement, ...current.entries] };
      return ensureEntryCategories(withEntry, replacement);
    });
    setNotice(existed ? 'Eintrag aktualisiert' : 'Eintrag verschlüsselt gespeichert');
  }

  async function saveCategory(category: VaultCategory, oldId?: string) {
    await mutateVault(current => upsertCategory(current, category, oldId));
    setNotice(oldId ? 'Kategorie aktualisiert' : 'Kategorie erstellt');
  }
  async function deleteCategory(id: string) {
    await mutateVault(current => removeCategory(current, id));
    setNotice('Kategorie entfernt; Einträge bleiben erhalten');
  }

  async function deleteEntry(entry: VaultEntry) {
    if (!window.confirm('Eintrag "' + entry.title + '" unwiderruflich löschen?')) return;
    try {
      await mutateVault(current => ({ ...current, entries: current.entries.filter(value => value.id !== entry.id) }));
      setSelectedId(null); setNotice('Eintrag gelöscht');
    } catch { setNotice('Löschen fehlgeschlagen'); }
  }

  async function toggleFavorite(entry: VaultEntry) {
    try { await saveEntry({ ...entry, favorite: !entry.favorite, updatedAt: Date.now() }); }
    catch { setNotice('Änderung fehlgeschlagen'); }
  }

  async function recordActivity(entryId: string, kind: ActivityKind, fieldType?: string) {
    try {
      await mutateVault(current => ({ ...current, entries: current.entries.map(value =>
        value.id === entryId ? logActivity(value, kind, fieldType) : value
      ) }));
    } catch { /* Analytics may never block vault actions. */ }
  }

  function openEntry(id: string) {
    setSelectedId(id); setReveal([]); setShowExtraDetails(false);
    void recordActivity(id, 'open');
  }

  function toggleReveal(fieldId: string, entryId: string) {
    const wasShown = reveal.includes(fieldId);
    setReveal(current => current.includes(fieldId) ? current.filter(id => id !== fieldId) : [...current, fieldId]);
    if (!wasShown) void recordActivity(entryId, 'reveal');
  }

  async function copyValue(value: string, label: string, entryId?: string, fieldType?: string) {
    try {
      await Clipboard.write({ string: value });
      setNotice(label + ' kopiert');
      if (entryId) void recordActivity(entryId, 'copy', fieldType ?? label);
    } catch { setNotice('Kopieren nicht möglich – Clipboard-Berechtigung prüfen'); }
  }

  async function clearHistory(entryId: string) {
    try {
      await mutateVault(current => ({ ...current, entries: current.entries.map(entry =>
        entry.id === entryId ? { ...entry, passwordHistory: [] } : entry
      ) }));
      setNotice('Passwort-Historie gelöscht');
    } catch { setNotice('Historie konnte nicht gelöscht werden'); }
  }

  async function toggleDevice() {
    if (!key) return;
    try {
      if (deviceEnabled) { await disableDeviceUnlock(); setDeviceEnabled(false); setNotice('Geräteentsperrung deaktiviert'); }
      else { await enableDeviceUnlock(key); setDeviceEnabled(true); setNotice('Geräteentsperrung aktiviert'); }
    } catch { setNotice('Geräteauthentifizierung abgebrochen oder nicht verfügbar'); }
  }

  async function signIntoCloud(create: boolean) {
    setCloudBusy(true); setCloudError('');
    try {
      await cloudSignIn(cloudLoginEmail.trim(), cloudLoginPassword, create);
      setCloudLoginPassword(''); setCloudUser(cloudEmail());
      setNotice('Firebase-Konto verbunden');
    } catch { setCloudError('Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.'); }
    finally { setCloudBusy(false); }
  }

  async function uploadCloud() {
    setCloudBusy(true); setCloudError('');
    try {
      await writes.current;
      const stored = await readLocalVault();
      if (!stored) throw new Error('Kein lokaler Tresor.');
      const previous = await cloudDownload();
      if (previous && previous.ciphertext === stored.ciphertext) {
        setNotice('Die Cloud-Sicherung ist bereits aktuell.');
        return;
      }
      if (previous && !window.confirm('Eine andere Cloud-Sicherung existiert. Durch deinen aktuellen Tresor ersetzen? Nicht synchronisierte Änderungen anderer Geräte könnten verloren gehen.')) return;
      await cloudUpload(stored, vaultRevision(previous));
      setNotice('Deine verschlüsselte Sicherung wurde gespeichert.');
    } catch (error) {
      setCloudError(error instanceof Error && error.message.includes('CLOUD_CONFLICT')
        ? 'Die Sicherung wurde von einem anderen Gerät geändert. Bitte erneut prüfen.'
        : 'Sicherung fehlgeschlagen. Verbindung, Anmeldung und Cloud-Berechtigung prüfen.');
    } finally { setCloudBusy(false); }
  }

  async function downloadCloud() {
    setCloudBusy(true); setCloudError('');
    try {
      const remote = await cloudDownload();
      if (!remote) { setCloudError('Für dein Konto gibt es noch keine Cloud-Sicherung.'); return; }
      setRestorePassword('');
      setRestoreCandidate(remote);
    } catch {
      setCloudError('Cloud-Sicherung konnte nicht geladen werden. Bitte Verbindung prüfen.');
    } finally { setCloudBusy(false); }
  }

  async function confirmCloudRestore(event: FormEvent) {
    event.preventDefault();
    if (!restoreCandidate || cloudBusy) return;
    setCloudBusy(true); setCloudError('');
    try {
      await verifyCloudVault(restoreCandidate, restorePassword);
      await writes.current;
      await disableDeviceUnlock();
      setDeviceEnabled(false);
      await replaceVaultWithVerifiedCloudCopy(restoreCandidate);
      setPreviousBackupAvailable(true);
      setRestoreCandidate(null); setRestorePassword('');
      lockVault(); setHasVault(true);
      setNotice('Cloud-Sicherung wiederhergestellt. Bitte mit dem Sicherungspasswort öffnen.');
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Wiederherstellung fehlgeschlagen. Deine lokale Version bleibt erhalten.');
    } finally { setCloudBusy(false); }
  }

  async function undoCloudRestore() {
    if (!window.confirm('Den vorherigen lokalen Tresor zurückholen? Der aktuelle Stand bleibt verschlüsselt als Rückfallkopie erhalten.')) return;
    setCloudBusy(true); setCloudError('');
    try {
      await writes.current;
      await disableDeviceUnlock();
      setDeviceEnabled(false);
      if (!await restorePreviousLocalVault()) throw new Error('Keine vorherige lokale Sicherung gefunden.');
      setRestoreCandidate(null); setRestorePassword('');
      lockVault(); setHasVault(true);
      setNotice('Vorherigen Tresor wiederhergestellt. Bitte erneut entsperren.');
    } catch (error) {
      setCloudError(error instanceof Error ? error.message : 'Lokale Wiederherstellung fehlgeschlagen.');
    } finally { setCloudBusy(false); }
  }

  const entries = data?.entries ?? [];
  const categories = useMemo(() => data ? categoriesForVault(data) : [], [data]);
  const simple = preferences.mode === 'simple';
  const selectedAppearance = resolveAppearance(preferences.appearance, systemDark);
  const people = useMemo(() => [...new Set(entries.map(item => item.person).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')), [data]);
  const filtered = useMemo(() => entries.filter(item => {
    if (tab === 'favorites' && !item.favorite) return false;
    if (categoryFilter && !item.categories.includes(categoryFilter)) return false;
    if (personFilter && item.person !== personFilter) return false;
    const needle = query.toLocaleLowerCase('de');
    return [item.title, item.description, item.username, item.email, item.website, item.person, ...item.categories, ...(item.fields ?? []).map(field => field.label)]
      .some(value => value.toLocaleLowerCase('de').includes(needle));
  }).sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt), [data, tab, categoryFilter, personFilter, query]);
  const selected = entries.find(item => item.id === selectedId) ?? null;

  if (loading) return <main className="lock-layout"><div className="loader"/><p>Verschlüsselter Tresor wird vorbereitet...</p></main>;

  if (!data) return (
    <main className="lock-layout">
      <div className="lock-glow"/>
      <section className="lock-card">
        <div className="brand-icon large"><img src="/parola-icon.png" alt="Parola" /></div>
        <p className="eyebrow parola-gate-title">PASSWORT MANAGER: PAROLA</p>
        <h1>{hasVault ? <>Dein Tresor.<br/><span>Sicher geschützt.</span></> : <>Deine Passwörter.<br/><span>Einfach aufbewahrt.</span></>}</h1>
        <p className="lock-intro">{hasVault
          ? 'Öffne deinen Tresor mit deinem Passwort oder deinem Fingerabdruck.'
          : 'Lege jetzt ein Passwort für deinen persönlichen Tresor fest. Damit bleiben deine gespeicherten Zugänge geschützt.'}</p>
        <div className="lock-pill"><LockKeyhole size={15}/> Deine Daten werden verschlüsselt gespeichert</div>
        <form className="gate-form" onSubmit={gateSubmit}>
          <label>{hasVault ? 'Dein Tresor-Passwort' : 'Passwort für deinen Tresor'}
            <span className="master-password-control">
              <input type={showMaster ? 'text' : 'password'} autoComplete={hasVault ? 'current-password' : 'new-password'}
                value={master} onChange={e => setMaster(e.target.value)}
                placeholder={hasVault ? 'Passwort eingeben' : 'Ab 6 Zeichen möglich'} />
              <button type="button" className="master-visibility" onClick={() => setShowMaster(value => !value)}
                aria-label={showMaster ? 'Passwort verbergen' : 'Passwort anzeigen'}>{showMaster ? <EyeOff size={19}/> : <Eye size={19}/>}</button>
            </span>
          </label>
          {!hasVault && <>
            <p className="master-advice"><ShieldCheck size={18}/> <span><strong>Empfohlen: 12 Zeichen oder mehr.</strong> Mindestens 6 Zeichen sind erlaubt. Ein kurzes Passwort ist leichter zu erraten.</span></p>
            {master && masterPasswordStrength(master) === 'below-recommendation' && <p className="master-warning" role="status">Das Passwort ist zulässig, aber weniger sicher. Für den Schutz aller Zugänge lieber ein längeres wählen.</p>}
            <label>Passwort zur Kontrolle wiederholen
              <input type={showMaster ? 'text' : 'password'} autoComplete="new-password" value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="Dasselbe Passwort erneut eingeben"/>
            </label>
          </>}
          {gateError && <p className="error-box" role="alert">{gateError}</p>}
          <button className="primary-btn full" type="submit" disabled={working}>{working ? 'Bitte prüfen...' : hasVault ? 'Tresor entsperren' : 'Sicheren Tresor erstellen'} <ArrowLeft className="arrow-right" size={18}/></button>
        </form>
        {hasVault && deviceSupported && deviceEnabled && <button className="biometric-btn" disabled={working} onClick={() => void deviceUnlock()}><Fingerprint size={21}/> Mit Fingerabdruck öffnen</button>}

        <p className="lock-footnote">{hasVault ? 'Dein Tresor-Passwort bleibt auf deinem Gerät.' : 'Wichtig: Schreibe dir dein Tresor-Passwort an einem sicheren Ort auf. Ohne dieses Passwort sind die Daten nicht wiederherstellbar.'}</p>
      </section>
      <footer className="lock-footer">Passwort Manager: Parola · by Shadowless Studios</footer>
    </main>
  );

  const sectionTitle = tab === 'vault' ? 'Mein Tresor' : NAV.find(item => item.id === tab)?.label || 'Mein Tresor';
  const showEntries = tab === 'vault' || tab === 'favorites' || (tab === 'categories' && categoryFilter) || (tab === 'people' && personFilter);

  return (
    <div className={simple ? 'app-shell simple-ui text-' + preferences.textSize : 'app-shell expert-ui'}>
      <div className="app-content">
        <header className="topbar">
          <div className="brand-line"><div className="brand-icon"><img src="/parola-icon.png" alt="" /></div><div><strong>Passwort Manager: <span>Parola</span></strong><small>SHADOWLESS STUDIOS</small></div></div>
          <div className="top-actions">
            <span className="security-indicator"><span className="status-dot"/> Verschlüsselt</span>
            {!simple && <button type="button" className="mode-switch compact-switch" title="Bedienmodus wechseln"
              aria-label={'Zu ' + (simple ? 'Experten-Modus' : 'Einfach-Modus') + ' wechseln'}
              onClick={() => setPreferences(old => ({...old, mode: old.mode === 'simple' ? 'expert' : 'simple'}))}>
              <SlidersHorizontal size={15}/> {simple ? 'Einfach' : 'Experte'}
            </button>}
            <button type="button" className="icon-btn" onClick={lockVault} title="Tresor sperren" aria-label="Tresor sperren"><LockKeyhole size={20}/></button>
          </div>
        </header>

        <main>
          <div className="section-head">
            <div><p className="eyebrow">{simple ? 'MEINE PASSWÖRTER' : 'ÜBERSICHT'}</p><h1>{categoryFilter || personFilter || sectionTitle}</h1>
              <p className="section-subtitle">{tab === 'settings' ? (simple ? 'So funktioniert dein Tresor' : 'Sicherheit und Synchronisierung verwalten') : simple
                ? (tab === 'categories' ? 'Finde deine Zugänge in übersichtlichen Ordnern.' : entries.length + ' ' + (entries.length === 1 ? 'gespeicherter Zugang' : 'gespeicherte Zugänge'))
                : entries.length + ' ' + (entries.length === 1 ? 'Eintrag' : 'Einträge') + ' sicher verwahrt'}</p>
            </div>
            {tab !== 'settings' && tab !== 'insights' && (!simple || tab !== 'vault') && (tab === 'vault' || categoryFilter || tab === 'favorites') && <button className="add-btn" type="button" onClick={() => setShowQuickAdd(true)} aria-label="Neuen Eintrag hinzufügen"><Plus size={22}/><span>Neu</span></button>}
          </div>

          {tab === 'vault' && <div className="quick-action-strip">
            <button type="button" className="quick-primary" onClick={() => setShowQuickAdd(true)}><Plus size={22}/> {simple ? 'Passwort hinzufügen' : 'Schnell speichern'}</button>
            {!simple && <button type="button" className="quick-secondary" onClick={() => setShowOCR(true)}><CameraIcon size={20}/> Aus Bild erkennen</button>}
          </div>}

          {tab === 'vault' && !simple && <div className="welcome-panel">
            <div><span className="welcome-shield"><Shield size={21}/></span><h2>Alles an einem sicheren Ort.</h2><p>Deine sensiblen Daten sind lokal verschlüsselt und nur für dich sichtbar.</p></div>
            <div className="welcome-visual"><KeyRound size={45} strokeWidth={1.5}/></div>
          </div>}

          {tab !== 'settings' && tab !== 'insights' && (tab === 'vault' || categoryFilter || tab === 'favorites' || tab === 'people') && <div className="searchbox"><Search size={20}/><input aria-label="Einträge durchsuchen" placeholder={simple ? 'Nach einem Zugang suchen …' : 'Passwörter, Namen, E-Mails suchen...'} value={query} onChange={e => setQuery(e.target.value)}/>{query && <button className="icon-btn compact" onClick={() => setQuery('')} aria-label="Suche löschen"><X size={17}/></button>}</div>}

          {tab === 'vault' && !simple && people.length > 0 && <div className="person-filter">
            <label>Personenfilter <select value={personFilter ?? ''} onChange={e => setPersonFilter(e.target.value || null)}>
              <option value="">Alle Personen</option>{people.map(p => <option key={p} value={p}>{p}</option>)}
            </select></label>
            <button type="button" className="text-btn" onClick={() => setTab('people')}>Personen anzeigen</button>
          </div>}
          {tab === 'insights' && <InsightsPanel data={data} onOpen={openEntry} onDeleteHistory={clearHistory}/>}
          {tab === 'categories' && !categoryFilter && <CategoryManager simple={simple}
            categories={categories} entries={entries}
            onOpen={name => { setCategoryFilter(name); setQuery(''); }}
            onSave={saveCategory} onDelete={deleteCategory}/>}

          {tab === 'people' && !personFilter && <div className="collection-grid">
            {people.length === 0 ? <div className="empty-state"><UsersRound size={32}/><h3>Noch keine Personen</h3><p>Ordne beim Anlegen eines Eintrags eine Person oder ein Profil zu.</p></div> : people.filter(person => person.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de'))).map(person => (
              <button className="collection-card" type="button" key={person} onClick={() => { setPersonFilter(person); setQuery(''); }}>
                <span className="collection-icon person"><UserRound size={23}/></span><strong>{person}</strong><small>{entries.filter(item => item.person === person).length} Einträge</small><ChevronRight size={17}/>
              </button>
            ))}
          </div>}

          {showEntries && <>
            {(categoryFilter || personFilter) && <button className="back-filter" type="button" onClick={() => { setCategoryFilter(null); setPersonFilter(null); }}><ArrowLeft size={16}/> Alle {categoryFilter ? 'Kategorien' : 'Personen'}</button>}
            <div className="list-title"><h2>{tab === 'favorites' ? 'Markierte Einträge' : categoryFilter || personFilter ? 'Einträge in diesem Ordner' : simple ? 'Gespeicherte Zugänge' : 'Deine Einträge'}</h2><span>{filtered.length}</span></div>
            <div className="entries-list">
              {filtered.map(item => (
                <article className="entry-card" key={item.id}>
                  <button className="entry-open" onClick={() => openEntry(item.id)} aria-label={item.title + ' öffnen'}>
                    <span className="entry-avatar">{item.images[0] ? <img src={item.images[0]} alt=""/> : getInitials(item.title)}</span>
                    <span className="entry-text"><strong>{item.title}</strong><small>{item.email || item.username || item.description || (simple ? 'Zum Öffnen antippen' : 'Sicherer Eintrag')}</small>
                      <span className="mini-tags">{item.person && <em>{item.person}</em>}{item.categories.slice(0, 2).map(category => <em key={category}>{category}</em>)}</span></span>
                  </button>
                  <div className="entry-actions">
                    {simple ? <button className="simple-copy-btn" type="button" aria-label={'Passwort für '+item.title+' kopieren'}
                      onClick={() => void copyValue(item.password, 'Passwort', item.id, 'Passwort')} disabled={!item.password}>
                      <Copy size={19}/> Kopieren
                    </button> :
                    <button className="icon-btn compact" type="button" title="Passwort kopieren" aria-label="Passwort kopieren"
                      onClick={() => void copyValue(item.password, 'Passwort', item.id, 'Passwort')} disabled={!item.password}><Copy size={19}/></button>}
                    {!simple && <button className={'icon-btn compact ' + (item.favorite ? 'is-favorite' : '')} type="button" title="Favorit" aria-label="Favorit" onClick={() => void toggleFavorite(item)}><Star size={19} fill={item.favorite ? 'currentColor' : 'none'}/></button>}
                    <button className="icon-btn compact chevron" type="button" aria-label="Details" onClick={() => openEntry(item.id)}><ChevronRight size={19}/></button>
                  </div>
                </article>
              ))}
              {filtered.length === 0 && <div className="empty-state"><KeyRound size={34}/><h3>{query ? 'Keine Treffer gefunden' : 'Hier ist noch alles frei'}</h3><p>{query ? 'Versuche einen anderen Suchbegriff.' : 'Tippe auf „Neues Passwort speichern“, um deinen ersten Zugang anzulegen.'}</p>{!query && <button className="secondary-btn" type="button" onClick={() => setShowQuickAdd(true)}><Plus size={17}/> Passwort speichern</button>}</div>}
            </div>
          </>}

          {tab === 'settings' && <div className="settings-layout">
            <section className="settings-card mode-card">
              <div className="settings-heading"><span className="settings-icon"><SlidersHorizontal size={22}/></span>
                <div><h2>Bedienung</h2><p>Wähle die passende Oberfläche.</p></div>
              </div>
              <div className="mode-choice" role="group" aria-label="Bedienmodus">
                <button className={simple ? 'active' : ''} type="button" aria-pressed={simple}
                  onClick={() => setPreferences(old => ({...old,mode:'simple'}))}>
                  <strong>Einfach</strong><small>Wenige Schritte und gut lesbare Texte</small>
                </button>
                <button className={!simple ? 'active' : ''} type="button" aria-pressed={!simple}
                  onClick={() => setPreferences(old => ({...old,mode:'expert'}))}>
                  <strong>Experte</strong><small>Alle Funktionen und weitere Einstellungen</small>
                </button>
              </div>
              <p className="settings-note">Die Wahl ändert nur die Darstellung. Gespeicherte Zugangsdaten bleiben immer erhalten.</p>
              <div className="accessibility-options">
                <div className="field-label">Darstellung</div>
                <div className="appearance-choice theme-choice" role="group" aria-label="Hell oder Dunkel wählen">
                  {APPEARANCE_CHOICES.map(([value,label])=><button key={value} type="button"
                    className={selectedAppearance === value ? 'active' : ''}
                    aria-pressed={selectedAppearance === value}
                    onClick={()=>setPreferences(previous=>({...previous,appearance:value}))}>{label}</button>)}
                </div>
                <p className="settings-note">{preferences.appearance === 'system'
                  ? 'Die App übernimmt automatisch das Design deines Handys. Mit Hell oder Dunkel legst du eine eigene Auswahl fest.'
                  : 'Deine Auswahl bleibt gespeichert, auch wenn du die App schließt.'}</p>
                <div className="field-label">Schriftgröße im Einfach-Modus</div>
                <div className="appearance-choice" role="group" aria-label="Schriftgröße wählen">
                  {([
                    ['normal','Normal'],['large','Groß'],['extra-large','Sehr groß']
                  ] as const).map(([value,label])=><button key={value} type="button"
                    className={preferences.textSize === value ? 'active' : ''}
                    aria-pressed={preferences.textSize === value}
                    onClick={()=>setPreferences(previous=>({...previous,textSize:value}))}>{label}</button>)}
                </div>
              </div>
            </section>
            {!simple && <>
            <LicensePanel/>
            <section className="settings-card">
              <div className="settings-heading"><span className="settings-icon"><ArrowDownToLine size={22}/></span><div><h2>Passwörter importieren</h2><p>CSV und Excel (.xlsx) von anderen Passwort-Managern und Tabellen.</p></div></div>
              <p className="settings-note">Import ausschließlich auf diesem Gerät, keine Uploads. Vor dem Speichern werden Dubletten geprüft. Bitte unverschlüsselte Quelldatei nach dem Import sicher entfernen.</p>
              <button className="secondary-btn" type="button" onClick={() => setShowImporter(true)}><ArrowDownToLine size={17}/> Import-Assistent öffnen</button>
            </section>
            </>}
            <section className="settings-card">
              <div className="settings-heading"><span className="settings-icon"><Fingerprint size={22}/></span><div><h2>Entsperrung</h2><p>Schütze deinen Tresor mit deinem Gerät.</p></div></div>
              <div className="settings-row"><div><strong>Biometrie und Gerätesperre</strong><small>Fingerabdruck, unterstützte Gesichtserkennung, PIN oder Muster</small></div><button type="button" disabled={!deviceSupported} className={deviceEnabled ? 'toggle active' : 'toggle'} aria-label="Geräteentsperrung umschalten" aria-pressed={deviceEnabled} onClick={() => void toggleDevice()}><span/></button></div>
              {!deviceSupported && <p className="settings-note">Diese Funktion ist in der installierten Android-App mit eingerichteter Gerätesperre verfügbar.</p>}
              {simple && <button type="button" className="quick-optional-action" aria-expanded={showAdvancedSecurity} onClick={() => setShowAdvancedSecurity(v => !v)}>{showAdvancedSecurity ? 'Weitere Sicherheitseinstellungen schließen' : 'Weitere Sicherheitseinstellungen'}</button>}
              {(!simple || showAdvancedSecurity) && <div className="setting-timeouts">
                <label>Wenn die App im Hintergrund ist
                  <select aria-label="Sperrzeit im Hintergrund" value={preferences.backgroundLockMs}
                    onChange={event => setPreferences(old => ({...old,backgroundLockMs:Number(event.target.value)}))}>
                    {LOCK_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>Wenn die App geöffnet, aber unbenutzt ist
                  <select aria-label="Sperrzeit bei Inaktivität" value={preferences.idleLockMs}
                    onChange={event => setPreferences(old => ({...old,idleLockMs:Number(event.target.value)}))}>
                    {IDLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <p className="settings-note">Kurzes Wechseln zu einer anderen App erfordert nicht sofort eine neue Anmeldung. Nach einem vollständigen Neustart oder wenn Android den Prozess beendet, ist weiterhin eine sichere Entsperrung nötig.</p>
              </div>}
              <button className="outline-btn" type="button" onClick={lockVault}><LogOut size={17}/> Tresor jetzt sperren</button>
            </section>

            <section className="settings-card">
              <div className="settings-heading"><span className="settings-icon cloud"><Cloud size={22}/></span><div><h2>{simple ? 'Meine Passwörter sichern' : 'Firebase Cloud-Backup'}</h2><p>{simple ? 'Freiwillige Sicherung für einen späteren Handywechsel.' : 'Optional – nur verschlüsselte Tresordaten werden übertragen.'}</p></div></div>
              {!cloudConfigured ? <div className="info-panel"><Cloud size={19}/><p>{simple ? 'Cloud-Sicherung ist für diese Version noch nicht freigeschaltet.' : <>Firebase ist noch nicht eingerichtet. Trage die Konfiguration aus <code>.env.example</code> in <code>.env.local</code> ein und aktiviere Authentication sowie Firestore.</>}</p></div> : cloudUser ? <>
                <div className="signed-in"><span className="status-dot"/><span>Angemeldet als <strong>{cloudUser}</strong></span></div>
                <div className="cloud-buttons">
                  <button className="primary-btn" disabled={cloudBusy} onClick={() => void uploadCloud()}><ArrowUpToLine size={18}/> {simple ? 'Passwörter jetzt sichern' : 'Verschlüsseltes Backup hochladen'}</button>
                  <button className="secondary-btn" disabled={cloudBusy} onClick={() => void downloadCloud()}><ArrowDownToLine size={18}/> {simple ? 'Sicherung laden' : 'Cloud-Backup wiederherstellen'}</button>
                </div>
                <p className="settings-note">Nur verschlüsselte Daten verlassen dein Gerät. Eine Wiederherstellung erfordert das Sicherungspasswort; die vorige lokale Version bleibt verschlüsselt erhalten. Die Sicherung läuft nicht automatisch.</p>
                <button className="text-btn" onClick={() => void cloudSignOut().then(() => setCloudUser(null))}>Cloud-Konto abmelden</button>
              </> : <div className="cloud-login">
                <label>E-Mail<input type="email" autoComplete="username" value={cloudLoginEmail} onChange={e => setCloudLoginEmail(e.target.value)} placeholder="name@beispiel.de"/></label>
                <label>{simple ? 'Passwort für dein Sicherungskonto' : 'Firebase-Kontopasswort'}<input type="password" autoComplete="current-password" value={cloudLoginPassword} onChange={e => setCloudLoginPassword(e.target.value)} placeholder="Firebase-Passwort"/></label>
                <div className="cloud-buttons"><button className="primary-btn" disabled={cloudBusy || !cloudLoginEmail || !cloudLoginPassword} onClick={() => void signIntoCloud(false)}>Anmelden</button><button className="secondary-btn" disabled={cloudBusy || !cloudLoginEmail || cloudLoginPassword.length < 6} onClick={() => void signIntoCloud(true)}>Konto erstellen</button></div>
                <p className="settings-note">Dein Sicherungskonto-Passwort und das Tresor-Passwort sind unabhängig voneinander.</p>
              </div>}
              {previousBackupAvailable && <button type="button" className="outline-btn" disabled={cloudBusy} onClick={() => void undoCloudRestore()}><ArrowDownToLine size={18}/> Vorherigen lokalen Tresor zurückholen</button>}
              {cloudError && <p className="error-box" role="alert">{cloudError}</p>}
            </section>

            {!simple && <>
            <section className="settings-card">
              <div className="settings-heading"><span className="settings-icon"><UsersRound size={22}/></span><div><h2>Passwörter sicher teilen</h2><p>Geplant: Ende-zu-Ende-verschlüsselte Freigaben.</p></div></div>
              <div className="info-panel"><ShieldCheck size={21}/><p>Freigaben werden erst aktiviert, wenn Empfängerschlüssel, Einladungen, Widerruf und Verschlüsselung vollständig umgesetzt und überprüft sind. Es werden keine Klartext-Passwörter über Links oder Firebase geteilt.</p></div>
            </section>

            </>}
            <p className="version-line">Passwort Manager: Parola v0.6.5 · Shadowless Studios · Offline-first</p>
          </div>}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Hauptnavigation">{NAV.filter(item => !simple || ['vault','categories','settings'].includes(item.id)).map(item => { const Icon = item.icon; return <button key={item.id} type="button" className={tab === item.id ? 'nav-item selected' : 'nav-item'} onClick={() => { setTab(item.id); setCategoryFilter(null); setPersonFilter(null); setQuery(''); }}><Icon size={21} strokeWidth={tab === item.id ? 2.5 : 1.8}/><span>{item.label}</span></button>; })}</nav>

      {selected && <div className="overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedId(null); }}>
        <section className="sheet details-sheet" role="dialog" aria-modal="true" aria-label={selected.title}>
          <header className="sheet-header"><button className="icon-btn" onClick={() => setSelectedId(null)} aria-label="Zurück"><ArrowLeft size={20}/></button><h2>Eintrag anzeigen</h2><button className="icon-btn" onClick={() => { setEditing(selected); setSelectedId(null); }} aria-label="Bearbeiten"><Edit3 size={19}/></button></header>
          <div className="detail-top"><div className="detail-avatar">{selected.images[0] ? <img src={selected.images[0]} alt=""/> : getInitials(selected.title)}</div><h2>{selected.title}</h2><p>{selected.description || 'Dein sicherer Eintrag'}</p><div className="tag-row">{selected.person && <span>{selected.person}</span>}{selected.categories.map(tag => <span key={tag}>{tag}</span>)}</div></div>
          <div className="detail-fields">
            {selected.username && <div className="detail-field"><span><UserRound size={16}/> Benutzername</span><div><strong>{selected.username}</strong><button className="icon-btn compact" onClick={() => void copyValue(selected.username, 'Benutzername', selected.id, 'Benutzername')} aria-label="Benutzername kopieren"><Copy size={18}/></button></div></div>}
            {selected.email && <div className="detail-field"><span><Mail size={16}/> E-Mail</span><div><strong>{selected.email}</strong><button className="icon-btn compact" onClick={() => void copyValue(selected.email, 'E-Mail', selected.id, 'E-Mail')} aria-label="E-Mail kopieren"><Copy size={18}/></button></div></div>}
            {selected.password && <div className="detail-field"><span><KeyRound size={16}/> Passwort</span><div><strong className={!reveal.includes(selected.id) ? 'masked' : 'secret-text'}>{reveal.includes(selected.id) ? selected.password : '••••••••••••'}</strong><button className="icon-btn compact" onClick={() => toggleReveal(selected.id, selected.id)} aria-label="Passwort anzeigen oder verbergen">{reveal.includes(selected.id) ? <EyeOff size={18}/> : <Eye size={18}/>}</button><button className="icon-btn compact" onClick={() => void copyValue(selected.password, 'Passwort', selected.id, 'Passwort')} aria-label="Passwort kopieren"><Copy size={18}/></button></div></div>}
            {simple && <button type="button" className="secondary-btn show-more-entry" onClick={() => setShowExtraDetails(value => !value)}>
              {showExtraDetails ? 'Weniger anzeigen' : 'Weitere Informationen anzeigen'}
            </button>}
            {(!simple || showExtraDetails) && <>
            {selected.password && selected.passwordChangedAt && <div className="detail-field"><span><CalendarClock size={16}/> Passwort vergeben / geändert</span><strong>{formatDate(selected.passwordChangedAt)}</strong></div>}
            {(selected.fields ?? []).filter(field => field.value).map(field => <div className="detail-field" key={field.id}>
              <span><KeyRound size={16}/>{field.label}</span>
              <div>
                <strong className={field.kind === 'secret' || field.kind === 'pin' ? (reveal.includes(field.id) ? 'secret-text' : 'masked') : ''}>
                  {field.kind === 'secret' || field.kind === 'pin' ? (reveal.includes(field.id) ? field.value : '••••••••') : field.value}
                </strong>
                {(field.kind === 'secret' || field.kind === 'pin') && <button className="icon-btn compact" type="button" onClick={() => toggleReveal(field.id, selected.id)} aria-label="Wert anzeigen">{reveal.includes(field.id) ? <EyeOff size={18}/> : <Eye size={18}/>}</button>}
                {field.kind === 'url' && safeUrl(field.value) && <a href={safeUrl(field.value)!} target="_blank" rel="noopener noreferrer" aria-label="Link öffnen"><ExternalLink size={18}/></a>}
                <button className="icon-btn compact" type="button" onClick={() => void copyValue(field.value, field.label, selected.id, field.kind)} aria-label={field.label + ' kopieren'}><Copy size={18}/></button>
              </div>
            </div>)}
            {(selected.passwordHistory ?? []).length > 0 && <div className="detail-field history-details">
              <span><CalendarClock size={16}/> Vorherige Passwörter (verschlüsselt gespeichert)</span>
              {(selected.passwordHistory ?? []).map((past, index) => {
                const id = 'old-password-' + selected.id + '-' + index;
                return <div className="historical-password" key={id}>
                  <small>{formatDate(past.replacedAt)}</small>
                  <strong className={reveal.includes(id) ? 'secret-text' : 'masked'}>{reveal.includes(id) ? past.value : '••••••••'}</strong>
                  <button className="icon-btn compact" type="button" aria-label="Altes Passwort anzeigen" onClick={() => toggleReveal(id, selected.id)}>{reveal.includes(id) ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
                  <button className="icon-btn compact" type="button" aria-label="Altes Passwort kopieren" onClick={() => void copyValue(past.value, 'Altes Passwort', selected.id, 'Historie')}><Copy size={17}/></button>
                </div>;
              })}
              <button className="danger-btn" type="button" onClick={() => {if(window.confirm('Alle vorherigen Passwörter dieses Eintrags unwiderruflich löschen?')) void clearHistory(selected.id);}}><Trash2 size={15}/> Historie löschen</button>
            </div>}
            {selected.website && <div className="detail-field"><span><Globe2 size={16}/> Website</span><div><strong>{selected.website}</strong>{safeUrl(selected.website) && <a href={safeUrl(selected.website)!} target="_blank" rel="noopener noreferrer" aria-label="Website öffnen"><ExternalLink size={18}/></a>}</div></div>}
            {selected.notes && <div className="detail-field note-field"><span><Edit3 size={16}/> Kommentare / Notizen</span><p>{selected.notes}</p></div>}
            {selected.images.length > 0 && <div className="detail-field note-field"><span><ImagePlus size={16}/> Bilder</span><div className="detail-images">{selected.images.map((image, index) => <img key={index} src={image} alt={'Anhang ' + (index + 1)}/>)}</div></div>}
            </>}
          </div>
          <div className="detail-footer"><span>Aktualisiert am {formatDate(selected.updatedAt)}</span><button className="danger-btn" type="button" onClick={() => void deleteEntry(selected)}><Trash2 size={16}/> Löschen</button></div>
        </section>
      </div>}

      {showImporter && <ImportPanel existing={entries} onClose={() => setShowImporter(false)} onImport={async incoming => {
        await mutateVault(current => ({ ...current, entries: [...incoming, ...current.entries] }));
        setNotice(incoming.length + ' Einträge verschlüsselt importiert');
      }}/>}
      {restoreCandidate && <div className="overlay" role="presentation">
        <section className="sheet cloud-restore-sheet" role="dialog" aria-modal="true" aria-label="Cloud-Sicherung prüfen">
          <header className="sheet-header"><ShieldCheck size={21}/><h2>Sicherung sicher wiederherstellen</h2>
            <button type="button" className="icon-btn" disabled={cloudBusy} aria-label="Abbrechen"
              onClick={() => {setRestoreCandidate(null);setRestorePassword('');setCloudError('');}}><X size={20}/></button></header>
          <form className="editor-form" onSubmit={e => void confirmCloudRestore(e)}>
            <p className="input-help">Wir prüfen zuerst das Passwort deiner gesicherten Passwörter. Erst danach wird die Wiederherstellung durchgeführt.</p>
            <label>Passwort des gesicherten Tresors
              <input autoFocus type="password" autoComplete="off" required value={restorePassword}
                onChange={e => setRestorePassword(e.target.value)} placeholder="Passwort der Cloud-Sicherung"/>
            </label>
            <p className="master-warning">Die bisher gespeicherten Einträge werden ersetzt. Vorher wird eine verschlüsselte Rückfallkopie auf diesem Gerät erstellt.</p>
            {cloudError && <p className="error-box" role="alert">{cloudError}</p>}
            <div className="sheet-actions">
              <button type="button" className="secondary-btn" disabled={cloudBusy}
                onClick={() => {setRestoreCandidate(null);setRestorePassword('');setCloudError('');}}>Abbrechen</button>
              <button type="submit" className="primary-btn" disabled={cloudBusy || !restorePassword}>Prüfen und wiederherstellen</button>
            </div>
          </form>
        </section>
      </div>}
      {showQuickAdd && <QuickAdd key={categoryFilter ?? 'all'} categories={categories} simple={simple} initialCategories={categoryFilter ? [categoryFilter] : []} onClose={() => setShowQuickAdd(false)} onSave={saveEntry} onAdvanced={setEditing}/>}
      {showOCR && <OcrCapture onClose={() => setShowOCR(false)} onReview={setEditing}/>}
      {editing && <EntryEditor key={editing.id} entry={editing} categories={categories} people={people} simple={simple} onClose={() => setEditing(null)} onSave={saveEntry}/>}
      {notice && <div className="toast" role="status"><Check size={18}/>{notice}</div>}
    </div>
  );
}
