/**
 * Prepare exact host allowlist for the shared Firebase Google login page.
 * Safe local-only configuration: never edits Firebase, Hostinger or any Store.
 * node scripts/browser-auth-redirect-setup.mjs --status
 * node scripts/browser-auth-redirect-setup.mjs --chrome-id a...p (32 chars)
 * node scripts/browser-auth-redirect-setup.mjs --firefox-url https://HASH.extensions.allizom.org/
 */
import fs from 'node:fs';
import path from 'node:path';
import { validRedirect } from '../extensions/shared/google-handoff.mjs';

const file=path.resolve('.env.local');
function getEnv() {
  if (!fs.existsSync(file)) throw new Error('Lokale Firebase-Konfiguration fehlt');
  const raw=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');
  const values=Object.fromEntries(raw.split(/\r?\n/).map(line=>{
    const m=line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    return m?[m[1],m[2]]:[null,null];
  }).filter(x=>x[0]));
  if(values.VITE_FIREBASE_PROJECT_ID!=='password-manager-parola'){
    throw new Error('Falsches Firebase-Projekt – keine Änderungen');
  }
  return {raw,values};
}
function update(name,value,raw) {
  const line=name+'='+value;
  return raw.match(new RegExp('^'+name+'=.*$','m'))
    ? raw.replace(new RegExp('^'+name+'=.*$','m'),line)
    : raw.replace(/\s*$/,'\n')+line+'\n';
}
function chrome(id) {
  if(!/^[a-p]{32}$/.test(id)) throw new Error('Chrome-ID: genau 32 Zeichen a-p');
  return 'https://'+id+'.chromiumapp.org/parola';
}
function firefox(url) {
  if(!validRedirect(url) || !new URL(url).hostname.endsWith('.extensions.allizom.org'))
    throw new Error('Firefox: exakte browser.identity.getRedirectURL()-Adresse verwenden');
  return url;
}
function urls(values) {
  const result=[];
  if(values.VITE_GOOGLE_CHROME_EXTENSION_ID)
    result.push(chrome(values.VITE_GOOGLE_CHROME_EXTENSION_ID));
  if(values.VITE_PAROLA_FIREFOX_REDIRECT_URL)
    result.push(firefox(values.VITE_PAROLA_FIREFOX_REDIRECT_URL));
  return result;
}
const [mode,value]=process.argv.slice(2);
try {
  const {raw,values}=getEnv();
  if(mode==='--chrome-id' && value) values.VITE_GOOGLE_CHROME_EXTENSION_ID=value;
  else if(mode==='--firefox-url' && value) values.VITE_PAROLA_FIREFOX_REDIRECT_URL=value;
  else if(mode!=='--status' || value) throw new Error('Nutzung: --status | --chrome-id ITEM_ID | --firefox-url CALLBACK_URL');
  const redirects=urls(values);
  if(mode!=='--status'){
    let next=update('VITE_GOOGLE_CHROME_EXTENSION_ID',values.VITE_GOOGLE_CHROME_EXTENSION_ID||'',raw);
    next=update('VITE_PAROLA_FIREFOX_REDIRECT_URL',values.VITE_PAROLA_FIREFOX_REDIRECT_URL||'',next);
    next=update('VITE_PAROLA_APPROVED_EXTENSION_REDIRECTS',redirects.join(','),next);
    fs.writeFileSync(file,next,{encoding:'utf8',mode:0o600});
  }
  console.log('Firebase Google provider: already enabled in password-manager-parola.');
  console.log('Chrome Store extension ID: '+(values.VITE_GOOGLE_CHROME_EXTENSION_ID?'SET':'MISSING'));
  console.log('Firefox addon callback: '+(values.VITE_PAROLA_FIREFOX_REDIRECT_URL?'SET':'MISSING'));
  console.log('Allowed extension redirects: '+(redirects.length ? redirects.join(', ') : 'NONE - hosted login remains disabled'));
  console.log('Local configuration only. No live website or addon changed.');
}catch(error){
  console.error(error.message);process.exitCode=1;
}
