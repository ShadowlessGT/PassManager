import { buildSync } from 'esbuild';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const dir=mkdtempSync(join(root,'tools','play-release','out','modal-qa-'));
try {
  const source = `
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import VaultModal from './src/VaultModal';
import ImageViewer from './src/ImageViewer';
const testImage='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"><rect width="800" height="1200" fill="blue"/></svg>');
function Demo(){
  const [open,setOpen]=useState(false);
  const [image,setImage]=useState(false);
  return <><div style={{height:1800}}><button id="background" onClick={()=>setOpen(true)}>open</button></div>
  {open && <VaultModal freezePage className="overlay detail-overlay" label="Detail" onClose={()=>setOpen(false)}>
    <section className="sheet details-sheet"><button id="open-image" onClick={()=>setImage(true)}>image</button><button id="close-detail" onClick={()=>setOpen(false)}>close</button><div style={{height:1400,flexShrink:0}}>scroll</div></section>
    {image && <ImageViewer images={[testImage,testImage]} initialIndex={0} onClose={()=>setImage(false)}/>}
  </VaultModal>}</>;
}
const check=(condition,label)=>{if(!condition)throw Error(label);};
const click=(el)=>flushSync(()=>el.click());
try{
  const host=createRoot(document.getElementById('root'));
  flushSync(()=>host.render(<Demo/>));
  window.scrollTo(0,300);
  const start=window.scrollY;
  check(start>0,'initial page scroll');
  const background=document.getElementById('background');
  const initialTop=background.getBoundingClientRect().top;
  click(background);
  const detail=document.querySelector('.detail-overlay');
  check(detail.matches(':modal'),'native detail top layer');
  check(document.body.style.position==='fixed','background frozen');
  background.focus();check(document.activeElement!==background,'background cannot focus');
  window.scrollTo(0,800);
  check(Math.abs(background.getBoundingClientRect().top-initialTop)<2,'background scroll remains fixed');
  const sheet=document.querySelector('.details-sheet');
  sheet.scrollTop=200;check(sheet.scrollTop>0,'detail can scroll');
  click(document.getElementById('open-image'));
  const viewer=document.querySelector('.image-viewer-modal');
  check(viewer.matches(':modal'),'nested viewer modal');
  document.getElementById('close-detail').focus();
  check(document.activeElement!==document.getElementById('close-detail'),'detail inaccessible below viewer');
  click(viewer.querySelector('[aria-label="Vergrößern"]'));
  check(viewer.querySelector('.image-viewer-percent').textContent.includes('150'),'zoom works');
  click(viewer.querySelector('[aria-label="Nächstes Bild"]'));
  check(viewer.querySelector('strong').textContent.includes('2 / 2'),'navigation works');
  check(viewer.querySelector('.image-viewer-percent').textContent.includes('100'),'zoom resets on next image');
  click(viewer.querySelector('[aria-label="Bild schließen"]'));
  check(!document.querySelector('.image-viewer-modal')&&detail.matches(':modal'),'back to detail');
  check(document.body.style.position==='fixed','background still locked');
  click(document.getElementById('close-detail'));
  check(!document.querySelector('dialog'),'dialogs removed');
  check(document.body.style.position==='','body style restored');
  check(Math.abs(window.scrollY-start)<2,'scroll restored');
  document.getElementById('result').textContent='MODAL_BROWSER_QA_PASS';
}catch(e){document.getElementById('result').textContent='MODAL_BROWSER_QA_FAIL: '+e.message;}
`;
  const result=buildSync({stdin:{contents:source,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
  writeFileSync(join(dir,'test.js'),result.outputFiles[0].text);
  const css=readFileSync(join(root,'src','styles.css'),'utf8');
  writeFileSync(join(dir,'test.html'), '<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body><div id="root"></div><pre id="result">NOT_RUN</pre><script src="test.js"></script></body></html>');
  const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const run=spawnSync(edge,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--user-data-dir='+join(dir,'profile'),'--window-size=412,915','--dump-dom',pathToFileURL(join(dir,'test.html')).href],{encoding:'utf8',timeout:30000,windowsHide:true,maxBuffer:8*1024*1024});
  const match=run.stdout?.match(/<pre id="result">([^<]*)<\/pre>/);
  console.log(match?.[1]||'BROWSER_QA_NO_RESULT');
  if(!match?.[1]?.includes('MODAL_BROWSER_QA_PASS'))process.exitCode=1;
}finally{try{rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{}}
