import type { VaultEntry } from './types';
import { entriesAt } from './vaultLifecycle';
import type { VaultData } from './types';
import type { PendingLogin,PendingSecret } from './androidAutofill';

/** Never silently overwrite a password using a reported webDomain.
 * WebDomain is not independently attested by our Android service.
 */
export function possibleUpdates(vault:VaultData,meta:PendingLogin):VaultEntry[] {
  const username=meta.username.trim().toLocaleLowerCase('en');
  if(!username)return [];
  return entriesAt(vault,'active').filter(entry=>
    entry.username.toLocaleLowerCase('en')===username ||
    entry.email.toLocaleLowerCase('en')===username);
}

export function createCapturedEntry(capture:PendingSecret,title:string,username:string,website:string):VaultEntry {
  if(!capture.password || capture.password.length>4096)throw new Error('Kein gültiges Passwort erkannt.');
  const clean=title.trim();
  if(!clean)throw new Error('Bitte einen Namen für den Eintrag angeben.');
  // Do not trust an unverified captured URL as a destination. User supplies it.
  const web=website.trim();
  if(web && !/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#:]|$)/i.test(web))
    throw new Error('Webseite muss eine gültige HTTPS-Adresse sein.');
  const now=Date.now();
  return {
    id:crypto.randomUUID(),title:clean,username:username.trim(),email:'',
    password:capture.password,website:web,description:'Über Android-Autofill erkannt',
    notes:'Quelle (App-Paket): '+capture.appPackage,
    categories:[],person:'',images:[],favorite:false,fields:[],
    createdAt:now,updatedAt:now,passwordChangedAt:now
  };
}

export function updateCapturedEntry(current:VaultEntry,capture:PendingSecret):VaultEntry {
  if(!capture.password || capture.password.length>4096)throw new Error('Kein gültiges Passwort erkannt.');
  return {...current,password:capture.password,updatedAt:Date.now(),passwordChangedAt:Date.now()};
}
