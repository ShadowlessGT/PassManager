import { useState } from 'react';
import { Check, FolderPlus, Plus } from 'lucide-react';
import { categoryKey } from './categories';
import type { VaultCategory } from './types';

type Props = {
  available: VaultCategory[];
  selected: string[];
  onChange: (names: string[]) => void;
  compact?: boolean;
};
export default function CategoryPicker({available,selected,onChange,compact=false}: Props) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
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
  function add() {
    const name = newName.trim();
    if (!name || name.length > 70) return;
    const existing = choices.find(c => categoryKey(c.name) === categoryKey(name));
    if (!selected.some(item => categoryKey(item) === categoryKey(name)))
      onChange([...selected, existing?.name ?? name]);
    setNewName(''); setAdding(false);
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
      {!adding && <button type="button" className="category-chip category-add" onClick={()=>setAdding(true)}>
        <FolderPlus size={16}/> Neue Kategorie
      </button>}
    </div>
    {adding && <div className="category-inline-create">
      <input autoFocus aria-label="Neue Kategorie" placeholder="z. B. Router, Familie ..." maxLength={70}
        value={newName} onChange={event=>setNewName(event.target.value)}
        onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add();} if(event.key==='Escape')setAdding(false);}}/>
      <button type="button" className="secondary-btn" disabled={!newName.trim()} onClick={add}><Plus size={16}/> Hinzufügen</button>
    </div>}
  </div>;
}
