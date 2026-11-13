import { Camera, ClipboardCheck, Clock3, FileLock2, KeyRound, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CLIPBOARD_OPTIONS } from './preferences';
import type { UserPreferences } from './preferences';
import { failedUnlocks } from './securityAttempts';

type Props = {
  preferences: UserPreferences;
  onChange: (next: UserPreferences) => void;
  onChangeMaster: () => void;
  onBackup: () => void;
};

export default function SecurityOptions({ preferences, onChange, onChangeMaster, onBackup }: Props) {
  const update = (change: Partial<UserPreferences>) => onChange({ ...preferences, ...change });

  const setDestruct = (enabled: boolean) => {
    if (!enabled) { update({ selfDestructEnabled: false, showRemainingAttempts: false }); return; }
    const warning = 'ACHTUNG: Nach wiederholt falschem Master-Passwort wird der LOKALE Parola-Tresor samt lokalem Rückfall-Backup gelöscht. Ein Dateisystem kann trotzdem Spuren behalten; Firebase-Kopien bleiben unverändert. Bitte zuerst eine verschlüsselte .parola-Sicherung erstellen. Zur Aktivierung LÖSCHEN eingeben:';
    if (window.prompt(warning) === 'LÖSCHEN' &&
      window.confirm('Selbstzerstörungsmodus wirklich aktivieren? Du kannst nach Erreichen der Fehlversuche den lokalen Tresor verlieren.')) {
      update({ selfDestructEnabled: true });
    }
  };

  const setScreenshots = (allowed: boolean) => {
    if (allowed && !window.confirm('Damit können andere Apps und Android deine Parola-Ansicht als Screenshot erfassen. Wirklich erlauben?')) return;
    update({ screenshotsAllowed: allowed });
  };

  return <section className="settings-card">
    <div className="settings-heading">
      <span className="settings-icon"><ShieldCheck size={22}/></span>
      <div><h2>Sicherheit und Datenschutz</h2>
        <p>Schütze Zugangsdaten, Zwischenablage und deine lokale Sicherung.</p></div>
    </div>

    <div className="settings-row">
      <div><strong><KeyRound size={16}/> Master-Passwort ändern</strong>
        <small>Ändert die Verschlüsselung des lokalen Tresors. Danach eine neue Cloud-Sicherung erstellen.</small></div>
      <button className="secondary-btn" type="button" onClick={onChangeMaster}>Ändern</button>
    </div>

    <div className="settings-row">
      <div><strong><ClipboardCheck size={16}/> Zwischenablage automatisch leeren</strong>
        <small>Nur von Parola kopierte Werte werden gelöscht – und nur, solange sie noch unverändert in der Zwischenablage stehen. Android kann die Ausführung im Hintergrund verzögern.</small></div>
      <select aria-label="Zwischenablage-Leerungsintervall" value={preferences.clipboardClearMs}
        onChange={e => update({ clipboardClearMs: Number(e.target.value) })}>
        {CLIPBOARD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>

    <div className="settings-row">
      <div><strong><Lock size={16}/> Bei ausgeschaltetem Display sperren</strong>
        <small>Auf Android wird das Ausschalten des Bildschirms erkannt. Der Tresor wird beim nächsten Zugriff erneut entsperrt.</small></div>
      <button type="button" className={preferences.screenOffLock ? 'toggle active' : 'toggle'} aria-label="Sperren bei ausgeschaltetem Display"
        aria-pressed={preferences.screenOffLock} onClick={() => update({ screenOffLock: !preferences.screenOffLock })}><span/></button>
    </div>

    <div className="settings-row">
      <div><strong><Camera size={16}/> Bildschirmfotos erlauben</strong>
        <small>Standardmäßig verhindert Parola Screenshots und Bildschirmaufzeichnungen auf Android. Aktivieren nur bei Bedarf.</small></div>
      <button type="button" className={preferences.screenshotsAllowed ? 'toggle active' : 'toggle'} aria-label="Bildschirmfotos erlauben"
        aria-pressed={preferences.screenshotsAllowed} onClick={() => setScreenshots(!preferences.screenshotsAllowed)}><span/></button>
    </div>

    <div className="settings-row">
      <div><strong><ShieldAlert size={16}/> Selbstzerstörungsmodus (optional)</strong>
        <small>Kann den lokalen Tresor nach zu vielen falschen Master-Passwörtern löschen. Kein sicheres physisches Löschen und kein Schutz vor Offline-Angriffen; Cloud-Backups bleiben erhalten. Standard: Aus.</small></div>
      <button type="button" className={preferences.selfDestructEnabled ? 'toggle active' : 'toggle'} aria-label="Selbstzerstörungsmodus"
        aria-pressed={preferences.selfDestructEnabled} onClick={() => setDestruct(!preferences.selfDestructEnabled)}><span/></button>
    </div>

    {preferences.selfDestructEnabled && <div className="security-danger-options">
      <label className="setting-timeouts">Maximal fehlgeschlagene Master-Passwort-Versuche
        <select aria-label="Maximale Anmeldeversuche" value={preferences.selfDestructMaxAttempts}
          onChange={e => update({ selfDestructMaxAttempts: Number(e.target.value) })}>
          {[5, 10, 15, 20].map(count => <option key={count} value={count}>{count} Versuche</option>)}
        </select>
      </label>
      <label className="check-line"><input type="checkbox" checked={preferences.showRemainingAttempts}
        onChange={e => update({ showRemainingAttempts: e.target.checked })}/>
        <span>Verbleibende Versuche auf dem Sperrbildschirm zeigen</span></label>
      {preferences.showRemainingAttempts && <p className="settings-note">
        Noch {Math.max(0, preferences.selfDestructMaxAttempts - failedUnlocks())} Versuche bis zur lokalen Löschung.
      </p>}
    </div>}

    <div className="settings-row">
      <div><strong><FileLock2 size={16}/> Android-Systembackup</strong>
        <small>Aus Sicherheitsgründen derzeit ausgeschaltet. Stattdessen lässt sich der komplette verschlüsselte Parola-Tresor als .parola-Datei sichern.</small></div>
      <button className="secondary-btn" type="button" onClick={onBackup}>Backup</button>
    </div>
    <div className="info-panel"><Clock3 size={20}/>
      <p>Die App-Sperre bei Inaktivität und im Hintergrund sowie biometrisches Entsperren findest du im Abschnitt „Entsperrung“ oben. Alle Sicherheitsregeln wirken lokal auf diesem Gerät.</p>
    </div>
  </section>;
}
