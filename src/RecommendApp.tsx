import { useState } from 'react';
import { Share2, ExternalLink, X } from 'lucide-react';
import { useActiveLanguage } from './i18n';
import { RECOMMEND_TEXT } from './recommendI18n';
import { APP_NAME, QR_ASSET, shareParola, openParolaStore } from './recommendationService';
import VaultModal from './VaultModal';

export default function RecommendApp({ onClose }: { onClose: () => void }) {
  const [heading,hint,share,store,close,copied,error] = RECOMMEND_TEXT[useActiveLanguage()];
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function perform(action: 'share' | 'store') {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (action === 'share') {
        if (await shareParola() === 'copied') setMessage(copied);
      } else await openParolaStore();
    } catch { setMessage(error); }
    finally { setBusy(false); }
  }
  return <VaultModal className="overlay recommend-overlay" label={heading} onClose={onClose} freezePage>
    <section className="recommend-card">
      <button type="button" className="icon-btn recommend-close" aria-label={close} onClick={onClose}><X size={22}/></button>
      <img className="recommend-logo" src="/parola-icon.png" alt="" />
      <h2>{APP_NAME}</h2>
      <p className="recommend-heading">{heading}</p>
      <div className="recommend-qr"><img src={QR_ASSET} alt="QR – Google Play" width="225" height="225"/></div>
      <p className="recommend-hint">{hint}</p>
      <div className="recommend-actions">
        <button className="primary-btn" type="button" disabled={busy} onClick={()=>void perform('share')}><Share2 size={19}/>{share}</button>
        <button className="secondary-btn" type="button" disabled={busy} onClick={()=>void perform('store')}><ExternalLink size={18}/>{store}</button>
      </div>
      {message && <p className="recommend-status" role="status">{message}</p>}
    </section>
  </VaultModal>;
}
