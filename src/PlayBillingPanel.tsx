import { useEffect, useState } from 'react';
import { ShoppingBag, RefreshCw } from 'lucide-react';
import { nativeBillingAvailable, ultraProduct, startUltraPurchase, restoreUltraPurchase,
  verifyUltraToken, onUltraPurchaseUpdated } from './playBilling';
import type { PlayPurchase } from './playBilling';

const checkoutEnabled = import.meta.env.VITE_PLAY_BILLING_ENABLED === 'true';

export default function PlayBillingPanel({ loggedIn }: { loggedIn: boolean }) {
  const [price, setPrice] = useState('');
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setAvailable(false);
    setPrice('');
    if (!loggedIn || !nativeBillingAvailable || !checkoutEnabled) return;
    void ultraProduct().then(product => {
      if (!active) return;
      setAvailable(true); setPrice(product.price);
    }).catch(() => {
      if (active) setMessage('Google Play Ultra ist noch nicht verfügbar. Bitte den internen Testtrack prüfen.');
    });
    return () => { active = false; };
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn || !nativeBillingAvailable) return;
    let disposed = false;
    let handle: { remove(): Promise<void> } | undefined;
    void onUltraPurchaseUpdated(async update => {
      if (disposed) return;
      if (update.status === 'cancelled') {
        setBusy(false); setMessage('Der Kauf wurde abgebrochen.'); return;
      }
      if (update.status === 'error') {
        setBusy(false); setMessage('Google Play konnte den Kauf nicht abschließen.'); return;
      }
      const purchased = update.purchases.filter((item: PlayPurchase) => item.state === 'PURCHASED');
      if (purchased.length === 0) {
        setBusy(false); setMessage('Zahlung noch ausstehend. Ultra wird erst nach Abschluss freigeschaltet.');
        return;
      }
      try {
        for (const purchase of purchased) await verifyUltraToken(purchase);
        if (!disposed) setMessage('Parola Ultra wurde über Google Play bestätigt und freigeschaltet.');
      } catch {
        if (!disposed) setMessage('Kauf empfangen, aber noch nicht verifiziert. Bitte später „Käufe wiederherstellen“ wählen.');
      } finally { if (!disposed) setBusy(false); }
    }).then(result => {
      if (disposed) void result?.remove();
      else handle = result ?? undefined;
    }).catch(() => {
      if (!disposed) setMessage('Google Play Kaufbenachrichtigungen sind nicht verfügbar.');
    });
    return () => { disposed = true; if (handle) void handle.remove(); };
  }, [loggedIn]);

  async function buy() {
    setBusy(true); setMessage('');
    try {
      await startUltraPurchase();
      setMessage('Google Play Kaufdialog geöffnet. Die Zahlung wird geprüft.');
      // Completion is asynchronous via the native purchaseUpdated event.
    } catch {
      setBusy(false); setMessage('Kauf konnte nicht gestartet werden. Bitte Google Play und Anmeldung prüfen.');
    }
  }

  async function restore() {
    setBusy(true); setMessage('');
    try {
      const result = await restoreUltraPurchase();
      setMessage(result.restored > 0
        ? 'Parola Ultra wurde wiederhergestellt.'
        : result.pending > 0
          ? 'Es gibt noch eine ausstehende Zahlung.'
          : 'Kein abgeschlossener Ultra-Kauf für dieses Google-Play-Konto gefunden.');
    } catch {
      setMessage('Wiederherstellung derzeit nicht möglich. Google Play und Firebase-Verbindung prüfen.');
    } finally { setBusy(false); }
  }

  if (!nativeBillingAvailable) return <p className="settings-note">
    Der Ultra-Einmalkauf steht in der Android-App über Google Play zur Verfügung.
  </p>;

  return <div className="play-billing-panel">
    <p className="settings-note"><ShoppingBag size={16}/> <strong>Parola Ultra – einmaliger Google-Play-Kauf</strong></p>
    {!loggedIn ? <p className="settings-note">Bitte zuerst mit Firebase anmelden, damit die Ultra-Lizenz sicher deinem Konto zugeordnet werden kann.</p> :
      <>
        <p className="settings-note">{checkoutEnabled
          ? price ? 'Aktuelles Angebot: ' + price + ' · einmalig, kein Abo.' : 'Produktpreis wird über Google Play geladen.'
          : 'Der Google-Play-Kauf wird vorbereitet. Der Kaufbutton bleibt bis zur serverseitigen Freigabe deaktiviert.'}</p>
        <div className="cloud-buttons">
          <button className="primary-btn" type="button" disabled={!checkoutEnabled || !available || busy}
            onClick={() => void buy()}>Ultra freischalten{price ? ' · ' + price : ''}</button>
          <button className="secondary-btn" type="button" disabled={busy}
            onClick={() => void restore()}><RefreshCw size={16}/> Käufe wiederherstellen</button>
        </div>
      </>}
    {message && <p className="settings-note" role="status">{message}</p>}
  </div>;
}
