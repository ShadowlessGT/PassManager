import { describe,it,expect } from 'vitest';
import { blankEntry,newVault } from './types';
import { possibleUpdates,createCapturedEntry,updateCapturedEntry } from './autofillSuggestions';
const capture={id:'test',appPackage:'com.example.app',webDomain:'attacker.example',username:'alice',
  capturedAt:1234,password:'abcdefABC@!234'};
describe('Autofill suggestions are explicit and origin-isolated',()=>{
  it('suggests account matching only and never overwrites from unverified webDomain',()=>{
    const account={...blankEntry(),id:'1',username:'alice',website:'https://real-bank.com',password:'old'};
    const other={...blankEntry(),id:'2',username:'bob',password:'old'};
    const matches=possibleUpdates({...newVault(),entries:[account,other]},capture);
    expect(matches.map(entry=>entry.id)).toEqual(['1']);
    expect(account.password).toBe('old');
  });
  it('creates new entries without trusting origin and respects supplied website',()=>{
    const entry=createCapturedEntry(capture,'Example','alice','');
    expect(entry.website).toBe('');
    expect(entry.password).toBe(capture.password);
    expect(entry.notes).toContain('com.example.app');
    expect(()=>createCapturedEntry(capture,'Example','alice','http://example.com')).toThrow();
  });
  it('updates selected password without erasing other fields',()=>{
    const current={...blankEntry(),title:'Saved',password:'old',notes:'important'};
    const updated=updateCapturedEntry(current,capture);
    expect(updated.password).toBe(capture.password);
    expect(updated.notes).toBe('important');
    expect(current.password).toBe('old');
  });
});
