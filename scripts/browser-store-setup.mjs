/**
 * Parola browser store OAuth setup helper. No token, secret or vault content is persisted.
 * Run: node scripts/browser-store-setup.mjs --status
 *      node scripts/browser-store-setup.mjs --set-chrome-id <32-character-store-id>
 *      node scripts/browser-store-setup.mjs --set-chrome-client <client-id>.apps.googleusercontent.com
 *      node scripts/browser-store-setup.mjs --report
 * Status/Report may contact Firebase Admin read-only using the current gcloud identity.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

export const CHROME_ITEM_PATTERN = /^[a-p]{32}$/;
export const GOOGLE_CLIENT_PATTERN = /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;
const root = process.cwd();
const local = path.join(root,'.env.local');
const expectedProject = 'password-manager-parola';
const currentWebClient = '693424731365-i9rnvgav2pkbn4lbhmrk74u6cpd9m5fo.apps.googleusercontent.com';

function readEnv(file = local) {
  const result = {};
  if (!fs.existsSync(file)) return result;
  for (const line of fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) result[match[1]] = match[2].trim().replace(/^["']|["']$/g,'');
  }
  return result;
}
function updateLocal(key,value) {
  const env = readEnv();
  if (env.VITE_FIREBASE_PROJECT_ID !== expectedProject) {
    throw new Error('Stopped: local Firebase project ID is not password-manager-parola.');
  }
  const original = fs.readFileSync(local,'utf8');
  const pattern = new RegExp('^'+key+'=.*$','m');
  const line = key+'='+value;
  const updated = pattern.test(original) ? original.replace(pattern,line) :
    original.replace(/\s*$/, '\n')+line+'\n';
  fs.writeFileSync(local,updated,{encoding:'utf8',mode:0o600});
  console.log('Saved '+key+' in local gitignored .env.local (no admin credentials stored).');
}

async function firebaseProvider() {
  const command = process.platform==='win32'?'cmd.exe':'gcloud';
  const args = process.platform==='win32'?
    ['/d','/s','/c','gcloud auth print-access-token']:['auth','print-access-token'];
  const token = execFileSync(command,args,{encoding:'utf8',timeout:25000,
    stdio:['ignore','pipe','pipe']}).trim();
  const url = 'https://identitytoolkit.googleapis.com/admin/v2/projects/'+
    expectedProject+'/defaultSupportedIdpConfigs/google.com';
  const response = await fetch(url,{headers:{
    Authorization:'Bearer '+token,'x-goog-user-project':expectedProject
  },signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error('Firebase Admin read-only HTTP '+response.status);
  const config=await response.json();
  return {enabled:config.enabled===true,
    webClientMatches:config.clientId===currentWebClient};
}
function fileInfo(f) {
  if(!fs.existsSync(f)) return '(noch nicht erstellt)';
  return path.basename(f)+' ('+Math.round(fs.statSync(f).size/1024)+' KB)';
}
function reportText(env, cloud) {
  return [
    'PAROLA - Chrome und Firefox einmalig fuer alle Kunden einrichten',
    'Projekt: '+expectedProject,
    'Google Auth: '+(cloud?cloud.enabled?'AKTIV':'DEAKTIV':'Status manuell pruefen'),
    'Web OAuth Client bereits in Firebase: '+currentWebClient,
    '',
    'Chrome 1: https://chrome.google.com/webstore/devconsole',
    '  Add new item -> vorhandenes Chrome-ZIP als ENTWURF hochladen.',
    '  Item ID / Erweiterungs-ID kopieren (32 Zeichen, a-p).',
    '  Chrome ZIP: '+fileInfo(path.join(root,'browser-build','parola-chrome-dev-0.2.0.zip')),
    '',
    'Chrome 2: https://console.cloud.google.com/auth/clients?project='+expectedProject,
    '  Create client -> Application type: Chrome Extension',
    '  Name: Parola Chrome Add-on',
    '  Item ID: '+(env.VITE_GOOGLE_CHROME_EXTENSION_ID||'<CHROME-ITEM-ID-AUS-STORE>'),
    '  Die neue OAuth CLIENT-ID notieren.',
    '  HINWEIS: Die bestehende WEB-Client-ID ist hier NICHT die richtige.',
    '',
    'Chrome 3: ChatGPT die zwei Werte schicken:',
    '  Chrome Item ID = '+(env.VITE_GOOGLE_CHROME_EXTENSION_ID||'<noch unbekannt>'),
    '  Chrome OAuth Client ID = '+(env.VITE_GOOGLE_CHROME_OAUTH_CLIENT_ID||'<noch unbekannt>'),
    '',
    'Firefox 1: https://addons.mozilla.org/developers/',
    '  Firefox-ZIP als Entwurf/privates Testpaket anlegen, NICHT live schalten.',
    '  Firefox ZIP: '+fileInfo(path.join(root,'browser-build','parola-firefox-dev-0.2.0.zip')),
    '  Feste Firefox Add-on ID: parola@shadowless-studios.eu',
    '  Firefox Google-Login benoetigt noch einen verifizierten Redirect/Callback.',
    '  Die bestehende WEB-Client-ID alleine reicht fuer die direkte Firefox-Weiterleitung NICHT.',
    '  KEIN Client Secret in ein Browser-Add-on schreiben.',
    '',
    'Firebase Authentication -> Sign-in method -> Google: bereits eingeschaltet.',
    'Google API key (AIza...): bereits lokal konfiguriert; kein zusaetzlicher OAuth Client.',
    'Die Nutzer klicken spaeter nur Mit Google anmelden und entsperren ihren Tresor.',
    '',
    'Freigabestatus: Entwicklervorschau, NICHT VEROEFFENTLICHEN bis OAuth+E2E-Test.',
    ''
  ].join('\r\n');
}
async function run() {
  const args = process.argv.slice(2);
  const command = args[0]||'--status';
  if(['--set-chrome-id','--set-chrome-client'].includes(command)){
    if(args.length!==2) throw new Error('Expected exactly one argument.');
    const value=args[1].trim();
    if(command==='--set-chrome-id' && !CHROME_ITEM_PATTERN.test(value))
      throw new Error('Expected 32 lowercase characters a-p from Chrome Web Store.');
    if(command==='--set-chrome-client' && !GOOGLE_CLIENT_PATTERN.test(value))
      throw new Error('Expected Google OAuth client ID from type Chrome Extension.');
    updateLocal(command==='--set-chrome-id'?
      'VITE_GOOGLE_CHROME_EXTENSION_ID':'VITE_GOOGLE_CHROME_OAUTH_CLIENT_ID',value);
    return;
  }
  if(!['--status','--report'].includes(command) || args.length>1)
    throw new Error('Usage: node scripts/browser-store-setup.mjs [--status|--report|--set-chrome-id ID|--set-chrome-client ID]');
  const env = readEnv();
  if(env.VITE_FIREBASE_PROJECT_ID!==expectedProject)
    throw new Error('Wrong local Firebase project; aborting.');
  let cloud = null;
  try {cloud=await firebaseProvider();} catch (err) {
    console.warn('Live provider verification not available: '+err.message);
  }
  console.log('Firebase project: '+expectedProject);
  console.log('Google provider: '+(cloud?cloud.enabled?'ENABLED':'DISABLED':'not verified'));
  console.log('Existing Firebase web OAuth client: '+(cloud?.webClientMatches?'VERIFIED':'not verified'));
  console.log('Chrome Store ID: '+(CHROME_ITEM_PATTERN.test(env.VITE_GOOGLE_CHROME_EXTENSION_ID||'')?'SET':'MISSING'));
  console.log('Chrome Extension OAuth ID: '+(GOOGLE_CLIENT_PATTERN.test(env.VITE_GOOGLE_CHROME_OAUTH_CLIENT_ID||'')?'SET':'MISSING'));
  console.log('Firefox verified OAuth callback: NOT CONFIGURED');
  if(command==='--report') {
    const dest=path.join(os.homedir(),'Desktop','Parola-Browser-Addons-Test','PAROLA-WAS-EINTRAGEN.txt');
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,reportText(env,cloud),'utf8');
    console.log('Exact store setup fields saved: '+dest);
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  run().catch(err=>{console.error('Setup stopped: '+err.message);process.exitCode=1;});
}
export {readEnv,reportText};
