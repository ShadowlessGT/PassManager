import type { VaultCategory,VaultEntry } from './types';
import { categoryKey } from './categories';

export type SortMode='newest'|'opened'|'modified'|'alphabetical';
export const SORT_OPTIONS:{value:SortMode;label:string}[]=[
  {value:'newest',label:'Zuletzt hinzugefügt'},
  {value:'opened',label:'Meist geöffnet'},
  {value:'modified',label:'Zuletzt geändert (Datum)'},
  {value:'alphabetical',label:'Alphabetisch (A–Z)'}
];
export const isSortMode=(value:unknown):value is SortMode =>
  value==='newest'||value==='opened'||value==='modified'||value==='alphabetical';

const finite=(value:unknown):number=>typeof value==='number'&&Number.isFinite(value)?value:0;
const alpha=(a:string,b:string)=>a.localeCompare(b,'de',{sensitivity:'base',numeric:true});
const newestFirst=(a:number,b:number)=>b-a;

export function sortVaultEntries(entries:VaultEntry[],sort:SortMode):VaultEntry[]{
  return [...entries].sort((a,b)=>{
    const alphabetical=alpha(a.title,b.title);
    if(sort==='alphabetical')return alphabetical || alpha(a.id,b.id);
    if(sort==='opened')return newestFirst(finite(a.activity?.opens),finite(b.activity?.opens)) ||
      newestFirst(finite(a.activity?.lastOpenedAt),finite(b.activity?.lastOpenedAt)) ||
      alphabetical || alpha(a.id,b.id);
    if(sort==='modified')return newestFirst(finite(a.updatedAt),finite(b.updatedAt)) ||
      alphabetical || alpha(a.id,b.id);
    return newestFirst(finite(a.createdAt),finite(b.createdAt)) || alphabetical || alpha(a.id,b.id);
  });
}

export function sortVaultCategories(categories:VaultCategory[],entries:VaultEntry[],sort:SortMode):VaultCategory[]{
  if(sort==='alphabetical')return [...categories].sort((a,b)=>alpha(a.name,b.name)||alpha(a.id,b.id));
  const stats=new Map<string,{opens:number;newestEntry:number;modified:number}>();
  for(const entry of entries){
    for(const key of new Set(entry.categories.map(categoryKey))){
      if(!key)continue;
      const value=stats.get(key)??{opens:0,newestEntry:0,modified:0};
      value.opens+=Math.max(0,finite(entry.activity?.opens));
      value.newestEntry=Math.max(value.newestEntry,finite(entry.createdAt));
      value.modified=Math.max(value.modified,finite(entry.updatedAt));
      stats.set(key,value);
    }
  }
  const statsFor=(category:VaultCategory)=>stats.get(categoryKey(category.name));
  return [...categories].sort((a,b)=>{
    const aStat=statsFor(a),bStat=statsFor(b);
    if(sort==='opened')return newestFirst(aStat?.opens??0,bStat?.opens??0)||
      alpha(a.name,b.name)||alpha(a.id,b.id);
    if(sort==='modified')return newestFirst(Math.max(finite(a.updatedAt),aStat?.modified??0),
      Math.max(finite(b.updatedAt),bStat?.modified??0))||alpha(a.name,b.name)||alpha(a.id,b.id);
    // For legacy categories created before timestamps existed, use the most
    // recently added entry as the best available historical fallback.
    return newestFirst(finite(a.createdAt)||aStat?.newestEntry||0,
      finite(b.createdAt)||bStat?.newestEntry||0)||alpha(a.name,b.name)||alpha(a.id,b.id);
  });
}
