import { buildSync } from 'esbuild';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const dir=mkdtempSync(join(root,'tools','play-release','out','recommend-qa-'));
try {
  const source=`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import RecommendApp from './src/RecommendApp';
import {applyLanguage} from './src/i18n';
function Demo(){
 const [open,setOpen]=useState(false);
 return <><button id="brand" onClick={()=>setOpen(true)}>Parola</button>{open&&<RecommendApp onClose={()=>setOpen(false)}/>}</>;
}
const check=(c,s)=>{if(!c)throw Error(s);};
try{
 const host=createRoot(document.getElementById('root'));flushSync(()=>host.render(<Demo/>));
 for(const theme of ['dark','light']){
  document.documentElement.dataset.theme=theme;
  for(const lang of ['de','en','tr','ar','ta']){
   flushSync(()=>applyLanguage(lang));
   flushSync(()=>document.getElementById('brand').click());
   const dialog=document.querySelector('.recommend-overlay'),card=document.querySelector('.recommend-card');
   check(dialog.matches(':modal'),'modal');
   check(document.body.style.position==='fixed','scroll lock');
   document.getElementById('brand').focus();check(document.activeElement!==document.getElementById('brand'),'background focus blocked');
   const r=card.getBoundingClientRect();
   check(r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,'card fits '+theme+' '+lang);
   check(card.querySelectorAll('.recommend-actions button').length===2,'actions');
   check(card.querySelector('.recommend-qr img').getAttribute('src')==='/parola-play-qr.svg','local QR');
   check(card.querySelector('.recommend-qr').getBoundingClientRect().width>=170,'QR scan size');
   flushSync(()=>card.querySelector('.recommend-close').click());
   check(!document.querySelector('.recommend-overlay'),'close');
   check(document.body.style.position==='','scroll restored');
  }
 }
 document.getElementById('result').textContent='RECOMMEND_BROWSER_QA_PASS';
}catch(e){document.getElementById('result').textContent='FAIL: '+e.message;}
`;
  const out=buildSync({stdin:{contents:source,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
  writeFileSync(join(dir,'test.js'),out.outputFiles[0].text);
  const css=readFileSync(join(root,'src','styles.css'),'utf8');
  writeFileSync(join(dir,'test.html'),'<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body><div id="root"></div><pre id="result">NOT_RUN</pre><script src="test.js"></script></body></html>');
  for(const size of ['320,540','412,915','768,1024']){
   const run=spawnSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--user-data-dir='+join(dir,'profile-'+size),'--window-size='+size,'--dump-dom',pathToFileURL(join(dir,'test.html')).href],{encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:8*1024*1024});
   const result=run.stdout?.match(/<pre id="result">([^<]*)<\/pre>/)?.[1]||'NO_RESULT';
   console.log(size,result);
   if(result!=='RECOMMEND_BROWSER_QA_PASS')process.exitCode=1;
  }
}finally{try{rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{}}
