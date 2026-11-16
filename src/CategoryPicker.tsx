import { useState } from 'react';
import { Check, FolderPlus, Plus } from 'lucide-react';
import { categoryKey } from './categories';
import type { VaultCategory } from './types';

type Props = {
  available: VaultCategory[];
  selected: string[];
  onChange: (names: string[]) => void;
  onCreate: (name: string) => Promise<string>;
  compact?: boolean;
};
export default function CategoryPicker({available,selected,onChange,onCreate,compact=false}: Props) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choices = [...available];
  for (const value of selected) {
    if (!choices.some(item => categoryKey(item.name) === categoryKey(value)))
      choices.push({id:'draft-'+value,name:value,icon:'folder',color:'#4F9FA5'});
  }
  function choose(name: string) {
    const exists = selected.some(item => categoryKey(item) === categoryKey(name));
    onChange(exists
      ? selected.filter(item => categoryKey(item) !== categoryKey(name))
      : [...selected, name]);
  }
  async function add() {
    if (busy) return;
    const requestedName = newName.trim();
    if (!requestedName || requestedName.length > 70) {
      setError('Bitte einen Kategorienamen mit höchstens 70 Zeichen eingeben.');
      return;
    }
    setBusy(true); setError('');
    try {
      const existing = choices.find(cat => categoryKey(cat.name) === categoryKey(requestedName));
      // New categories are saved in the encrypted vault immediately. Closing
      // or cancelling the entry editor must not silently discard the category.
      const categoryName = existing ? existing.name : await onCreate(requestedName);
      if (!selected.some(item => categoryKey(item) === categoryKey(categoryName)))
        onChange([...selected, categoryName]);
      setNewName(''); setAdding(false);
    } catch (reason) {
      setError((reason as Error).message || 'Kategorie konnte nicht erstellt werden.');
    } finally {
      setBusy(false);
    }
  }
  return <div className={compact ? 'category-picker compact' : 'category-picker'}>
    <strong className="field-label">Kategorien <small>Optional · Mehrfachauswahl</small></strong>
    <div className="category-chip-grid">
      {choices.map(cat => {
        const active = selected.some(value => categoryKey(value) === categoryKey(cat.name));
        return <button key={cat.id} type="button" className={active ? 'category-chip chosen' : 'category-chip'}
          onClick={() => choose(cat.name)} aria-pressed={active}>
          <span className="category-chip-dot" style={{backgroundColor:cat.color}}/>
          {cat.name}{active && <Check size={14}/>}
        </button>;
      })}
      {!adding && <button type="button" className="category-chip category-add" onClick={()=>{setError('');setAdding(true);}}>
        <FolderPlus size={16}/> Neue Kategorie
      </button>}
    </div>
    {adding && <div className="category-inline-create">
      <input autoFocus aria-label="Neue Kategorie" placeholder="z. B. Router, Familie ..." maxLength={70}
        value={newName} onChange={event=>setNewName(event.target.value)}
        onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();void add();} if(event.key==='Escape'&&!busy){setAdding(false);setError('');}}}/>
      <button type="button" className="secondary-btn" disabled={busy || !newName.trim()} onClick={()=>void add()}><Plus size={16}/> {busy?'Wird gespeichert...':'Erstellen'}</button>
      <button type="button" className="text-btn" disabled={busy} onClick={()=>{setAdding(false);setError('');}}>Abbrechen</button>
    </div>}
    {error && <p className="error-box" role="alert">{error}</p>}
  </div>;
}
