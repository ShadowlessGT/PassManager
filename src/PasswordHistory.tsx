import { useState } from 'react';
import { CalendarClock, ChevronRight, Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { VaultEntry } from './types';
import { visiblePreviousPasswords } from './insights';

type Props = {
  entry: VaultEntry;
  formatDate: (timestamp: number) => string;
  onReveal: () => void;
  onCopy: (value: string) => void;
  onClear: () => void;
};

/** Historical credentials are kept out of the DOM until explicitly requested. */
export default function PasswordHistory({ entry, formatDate, onReveal, onCopy, onClear }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState<number[]>([]);
  const previous = visiblePreviousPasswords(entry)
    .slice().sort((a, b) => b.replacedAt - a.replacedAt);
  if (!previous.length) return null;
  return <section className="password-history-compact" aria-label="Passwort-Historie">
    <button type="button" className="history-toggle" aria-expanded={expanded}
      onClick={() => { setExpanded(value => !value); setRevealed([]); }}>
      <CalendarClock size={16} aria-hidden="true"/>
      <span>Passwort-Historie</span><span className="history-count">{previous.length}</span>
      <ChevronRight size={16} className={expanded ? 'history-chevron expanded' : 'history-chevron'} aria-hidden="true"/>
    </button>
    {expanded && <div className="history-expanded">
      <p className="history-help">Frühere Passwörter · verschlüsselt gespeichert</p>
      {previous.map((past, index) => {
        const visible = revealed.includes(index);
        return <div className="historical-password" key={past.replacedAt + ':' + index}>
          <small>{formatDate(past.replacedAt)}</small>
          <strong className={visible ? 'secret-text' : 'masked'}>{visible ? past.value : '\u2022'.repeat(8)}</strong>
          <button className="icon-btn compact" type="button" aria-label={visible ? 'Altes Passwort verbergen' : 'Altes Passwort anzeigen'}
            onClick={() => {
              if (!visible) onReveal();
              setRevealed(ids => visible ? ids.filter(id => id !== index) : [...ids, index]);
            }}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
          <button className="icon-btn compact" type="button" aria-label="Altes Passwort kopieren"
            onClick={() => onCopy(past.value)}><Copy size={17}/></button>
        </div>;
      })}
      <button className="danger-btn history-clear" type="button" onClick={onClear}><Trash2 size={15}/> Historie löschen</button>
    </div>}
  </section>;
}
