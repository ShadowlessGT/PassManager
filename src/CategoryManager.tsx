import { useState } from 'react';
import type { FormEvent } from 'react';
import { BriefcaseBusiness, Car, Folder, Gamepad2, GraduationCap, Heart, Home, Plus, ShoppingBag, Trash2, Wallet, Wifi, X, Pencil } from 'lucide-react';
import type { VaultCategory, VaultEntry } from './types';
import { CATEGORY_COLORS, CATEGORY_ICONS, makeCategory } from './categories';
type Props = {
  categories: VaultCategory[];
  entries: VaultEntry[];
  onOpen: (name: string) => void;
  onSave: (category: VaultCategory, oldId?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};
const icons = {
  folder: Folder, home: Home, briefcase: BriefcaseBusiness, wallet: Wallet,
  'shopping-bag': ShoppingBag, heart: Heart, wifi: Wifi, 'gamepad-2': Gamepad2,
  car: Car, 'graduation-cap': GraduationCap
};
export function CategoryIcon({category, size=22}:{category:VaultCategory;size?:number}) {
  const Icon = icons[category.icon as keyof typeof icons] || Folder;
  return <Icon size={size}/>;
}
export default function CategoryManager({categories, entries, onOpen,onSave,onDelete}:Props){
  const [editing,setEditing] = useState<VaultCategory|null>(null);
  const [newCategory,setNewCategory]=useState(false);
  const [name,setName]=useState('');
  const [color,setColor]=useState<string>(CATEGORY_COLORS[0]);
  const [icon,setIcon]=useState('folder');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  function edit(category?:VaultCategory){
    setEditing(category ?? null);setNewCategory(!category);
    setName(category?.name??'');setColor(category?.color??CATEGORY_COLORS[0]);
    setIcon(category?.icon??'folder');setError('');
  }
  async function save(event:FormEvent){
    event.preventDefault();setError('');setBusy(true);
    try {await onSave({ ...makeCategory(name,icon,color),id:editing?.id??crypto.randomUUID() },editing?.id);
      setEditing(null);setNewCategory(false);
    }catch(reason){setError((reason as Error).message||'Kategorie konnte nicht gespeichert werden.');}
    finally{setBusy(false);}
  }
  return <div className="category-manager">
    <div className="category-manager-intro">
      <div><h2>Meine Kategorien</h2><p>Ordne deine Einträge übersichtlich. Eine Kategorie ist kein eigener Passwort-Eintrag.</p></div>
      <button type="button" className="secondary-btn" onClick={()=>edit()}><Plus size={17}/> Kategorie erstellen</button>
    </div>
    <div className="collection-grid">
      {categories.length===0 && <div className="empty-state"><Folder size={32}/><h3>Keine Kategorien</h3><p>Erstelle einen Ordner – danach kannst du Einträge hinzufügen.</p></div>}
      {categories.map(category=>{
        const count=entries.filter(item=>item.categories.some(name=>name.toLocaleLowerCase('de')===category.name.toLocaleLowerCase('de'))).length;
        return <div className="category-manager-card" key={category.id}>
          <button type="button" className="category-view-btn" onClick={()=>onOpen(category.name)} aria-label={'Kategorie '+category.name+' öffnen'}>
            <span className="category-large-icon" style={{backgroundColor:category.color+'30',color:category.color}}><CategoryIcon category={category}/></span>
            <strong>{category.name}</strong><small>{count} {count===1?'Eintrag':'Einträge'}</small>
          </button>
          <button type="button" className="category-edit-btn icon-btn" onClick={()=>edit(category)} aria-label={category.name+' bearbeiten'}><Pencil size={17}/></button>
        </div>;
      })}
    </div>
    {(newCategory||editing)&&<div className="overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setEditing(null);setNewCategory(false);}}}>
      <section className="sheet category-edit-sheet" role="dialog" aria-modal="true" aria-label={editing?'Kategorie bearbeiten':'Kategorie erstellen'}>
        <header className="sheet-header"><Folder size={20}/><h2>{editing?'Kategorie bearbeiten':'Neue Kategorie'}</h2>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={()=>{setEditing(null);setNewCategory(false);}}><X size={19}/></button></header>
        <form className="editor-form" onSubmit={e=>void save(e)}>
          <label>Kategoriename<input autoFocus maxLength={70} placeholder="z. B. Zuhause" value={name} onChange={e=>setName(e.target.value)}/></label>
          <div className="field-label">Symbol wählen</div><div className="category-icons">
            {CATEGORY_ICONS.map(choice=>{
              const Icon=icons[choice.value as keyof typeof icons];return <button type="button" title={choice.label} aria-label={choice.label} aria-pressed={icon===choice.value}
                className={icon===choice.value?'chosen':''} key={choice.value} onClick={()=>setIcon(choice.value)}><Icon size={21}/></button>;
            })}
          </div>
          <div className="field-label">Farbe wählen</div><div className="category-colors">
            {CATEGORY_COLORS.map(value=><button type="button" key={value} className={color===value?'selected':''}
              style={{backgroundColor:value}} aria-label={'Farbe '+value} aria-pressed={color===value} onClick={()=>setColor(value)}>
              {color===value&&<span><Folder size={16}/></span>}
            </button>)}
          </div>
          {error&&<p className="error-box" role="alert">{error}</p>}
          <div className="sheet-actions">
            {editing&&<button className="danger-btn" type="button" disabled={busy} onClick={()=>{
              if(!window.confirm('Kategorie "'+editing.name+'" entfernen? Zugehörige Einträge bleiben erhalten.'))return;
              setBusy(true);void onDelete(editing.id).then(()=>{setEditing(null);setNewCategory(false);})
                .catch(()=>setError('Löschen fehlgeschlagen.')).finally(()=>setBusy(false));
            }}><Trash2 size={15}/> Löschen</button>}
            <button className="primary-btn" type="submit" disabled={busy||!name.trim()}>Kategorie speichern</button>
          </div>
        </form>
      </section>
    </div>}
  </div>;
}
