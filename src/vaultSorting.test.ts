import {describe,expect,it} from 'vitest';
import {blankEntry} from './types';
import type {VaultCategory,VaultEntry} from './types';
import {sortVaultCategories,sortVaultEntries} from './vaultSorting';

const entry=(id:string,title:string,createdAt:number,updatedAt:number,opens:number,categories:string[]=[]):VaultEntry=>({
  ...blankEntry(),id,title,createdAt,updatedAt,categories,
  activity:{opens,copies:0,reveals:0,lastOpenedAt:createdAt,fieldCopies:{}}
});
const first=entry('1','Zürich',100,600,9,['Privat']);
const second=entry('2','Äpfel',300,400,2,['Arbeit']);
const third=entry('3','Beta',200,800,5,['Arbeit']);
const items=[first,second,third];
const names=(e:{id:string}[])=>e.map(v=>v.id);

describe('Vault ordering does not modify encrypted entry content or input arrays',()=>{
  it('sorts by creation time',()=>expect(names(sortVaultEntries(items,'newest'))).toEqual(['2','3','1']));
  it('sorts by open count',()=>expect(names(sortVaultEntries(items,'opened'))).toEqual(['1','3','2']));
  it('sorts by last edit',()=>expect(names(sortVaultEntries(items,'modified'))).toEqual(['3','1','2']));
  it('sorts alphabetically with German collation',()=>expect(names(sortVaultEntries(items,'alphabetical'))).toEqual(['2','3','1']));
  it('does not mutate source arrays',()=>{const before=items.map(x=>x.id);sortVaultEntries(items,'modified');expect(items.map(x=>x.id)).toEqual(before);});
  it('handles old entries without activity or timestamps',()=>{
    const old={...blankEntry(),id:'4',title:'Vorher',createdAt:0,updatedAt:0};
    expect(sortVaultEntries([old,first],'opened').map(x=>x.id)).toEqual(['1','4']);
  });
});
describe('Category order considers member entry activity and preserves names',()=>{
  const cats:VaultCategory[]=[
    {id:'a',name:'Arbeit',icon:'folder',color:'#ffffff'},
    {id:'b',name:'Privat',icon:'folder',color:'#ffffff'}
  ];
  it('sorts by total opens of member entries',()=>expect(names(sortVaultCategories(cats,items,'opened'))).toEqual(['b','a']));
  it('sorts legacy categories by newest entry',()=>expect(names(sortVaultCategories(cats,items,'newest'))).toEqual(['a','b']));
  it('sorts by member last modified timestamp',()=>expect(names(sortVaultCategories(cats,items,'modified'))).toEqual(['a','b']));
  it('respects a genuinely created new empty category',()=>{
    const newCategory={...cats[1],id:'c',name:'Neu',createdAt:1000};
    expect(names(sortVaultCategories([...cats,newCategory],items,'newest'))[0]).toBe('c');
  });
  it('handles no entries and stable alphabetical fallback',()=>{
    expect(names(sortVaultCategories(cats,[],'opened'))).toEqual(['a','b']);
  });
});
