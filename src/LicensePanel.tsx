import { useEffect, useState } from 'react';
import { Gift, ShieldCheck } from 'lucide-react';
import PlayBillingPanel from './PlayBillingPanel';
import { cloudConfigured, cloudSignIn } from './cloud';
import { adminCreateCodes, isAdmin, lookupLicense, redeemGiftCode } from './license';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getApp } from 'firebase/app';

export default function LicensePanel({ compact = false }: { compact?: boolean }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(0);
  const [generated, setGenerated] = useState<string[]>([]);

  useEffect(() => {
    if (!cloudConfigured) return;
    return onAuthStateChanged(getAuth(getApp()), user => {
      setLoggedIn(Boolean(user)); setAdmin(false); setGenerated([]);
      if (user) {
        void lookupLicense().then(x => setInfo(x.active ? x.lifetime ? 'Ultra dauerhaft aktiv' : 'Ultra bis ' + new Date(x.expiresAt!).toLocaleDateString('de-DE') : 'Keine aktive Ultra-Lizenz')).catch(() => setInfo('Lizenzstatus nicht verfügbar.'));
        void isAdmin().then(setAdmin).catch(() => setAdmin(false));
      } else setInfo('');
    });
  }, []);

  async function login(create: boolean) {
    setBusy(true); setStatus('');
    try { await cloudSignIn(email.trim(), pass, create); setPass(''); setStatus('Konto verbunden.'); }
    catch { setStatus('Anmeldung fehlgeschlagen. Bitte Anmeldedaten prüfen.'); }
    finally { setBusy(false); }
  }

  async function redeem() {
    setBusy(true); setStatus('');
    try {
      const grant = await redeemGiftCode(code.trim());
      setCode(''); window.dispatchEvent(new Event('parola-license-changed')); setInfo(grant.lifetime ? 'Pro dauerhaft aktiv' : 'Pro bis ' + new Date(grant.expiresAt!).toLocaleDateString('de-DE'));
      setStatus('Freischaltcode erfolgreich eingelöst.');
    } catch { setStatus('Einlösen fehlgeschlagen. Code, Login und Firebase App Check prüfen.'); }
    finally { setBusy(false); }
  }

  async function create() {
    setBusy(true); setStatus('');
    try {
      setGenerated(await adminCreateCodes(count, days));
      setStatus('Codes erstellt. Jetzt sicher aufbewahren – nur einmal sichtbar.');
    } catch { setStatus('Code-Erstellung fehlgeschlagen. Admin-Rolle und App Check prüfen.'); }
    finally { setBusy(false); }
  }

  if (!cloudConfigured) return compact ? null : <p className="settings-note">Freischaltungen sind vorbereitet, aber Firebase ist noch nicht konfiguriert.</p>;

  return <section className={compact ? 'license-compact' : 'settings-card'}>
    <div className="settings-heading"><span className="settings-icon"><Gift size={21}/></span><div>
      <h2>{compact ? 'Freischaltcode vorhanden?' : 'Parola Ultra & Freischaltcodes'}</h2>
      <p>Kostenlose Geschenkcodes mit Firebase-Konto einlösen.</p>
    </div></div>
    {!compact && <PlayBillingPanel loggedIn={loggedIn}/>}
    {!loggedIn ? <div className="cloud-login">
      <label>E-Mail<input type="email" autoComplete="username" placeholder="name@beispiel.de" value={email} onChange={e => setEmail(e.target.value)}/></label>
      <label>Kontopasswort<input type="password" autoComplete="current-password" value={pass} onChange={e => setPass(e.target.value)}/></label>
      <div className="cloud-buttons">
        <button className="secondary-btn" type="button" disabled={busy || !email || !pass} onClick={() => void login(false)}>Anmelden</button>
        <button className="secondary-btn" type="button" disabled={busy || !email || pass.length < 6} onClick={() => void login(true)}>Konto erstellen</button>
      </div>
    </div> : <>
      <p className="settings-note"><ShieldCheck size={15}/> {info || 'Lizenz wird geprüft'}</p>
      <div className="code-entry"><input aria-label="Freischaltcode" placeholder="PM-..." maxLength={48} autoComplete="off" value={code} onChange={e => setCode(e.target.value)}/><button className="primary-btn" type="button" disabled={busy || !code.trim()} onClick={() => void redeem()}>Einlösen</button></div>
      {admin && !compact && <div className="admin-code-panel">
        <h3>Admin · kostenlose Freischaltcodes</h3>
        <p className="settings-note">Einmalcodes, für 30 Tage einlösbar. 0 Tage Laufzeit ergibt Lifetime.</p>
        <div className="admin-controls">
          <label>Anzahl<input type="number" min={1} max={25} value={count} onChange={e => setCount(Number(e.target.value))}/></label>
          <label>Laufzeit (Tage)<input type="number" min={0} max={365} value={days} onChange={e => setDays(Number(e.target.value))}/></label>
          <button className="secondary-btn" type="button" disabled={busy || count < 1 || count > 25 || days < 0 || days > 365} onClick={() => void create()}>Codes erstellen</button>
        </div>
        {generated.length > 0 && <textarea className="generated-codes" readOnly aria-label="Erstellte Codes – einmalig anzeigen" rows={Math.min(8,generated.length+1)} value={generated.join('\n')}/>}
      </div>}
    </>}
    {status && <p role="status" className="settings-note">{status}</p>}
    {!compact && <p className="settings-note">Rabatte und kostenpflichtige Käufe gehören in Google Play Billing. Firebase-Geschenkcodes sind kein Zahlungsweg. Aktivierung erst nach Bereitstellung der Cloud Functions und App Check.</p>}
  </section>;
}
