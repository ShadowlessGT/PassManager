import type { VaultData } from './types';
import { exportVaultCsv } from './vaultTransfer';

const enc = new TextEncoder();
type ZipEntry = { name: string; bytes: Uint8Array };
const view = (bytes: Uint8Array) => new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
function w16(bytes:Uint8Array, offset:number, value:number) {view(bytes).setUint16(offset,value,true);}
function w32(bytes:Uint8Array, offset:number, value:number) {view(bytes).setUint32(offset,value>>>0,true);}
function crc32(bytes:Uint8Array):number {
  let crc=0xffffffff;
  for (const byte of bytes) {
    crc^=byte;
    for (let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function zipStore(entries:ZipEntry[]):Uint8Array {
  const local:Uint8Array[]=[],central:Uint8Array[]=[];
  let offset=0,centralSize=0;
  for(const entry of entries) {
    const name=enc.encode(entry.name), payload=entry.bytes, checksum=crc32(payload);
    const a=new Uint8Array(30+name.length+payload.length);
    w32(a,0,0x04034b50);w16(a,4,20);w16(a,6,0x0800);
    w32(a,14,checksum);w32(a,18,payload.length);w32(a,22,payload.length);
    w16(a,26,name.length);a.set(name,30);a.set(payload,30+name.length);
    local.push(a);
    const b=new Uint8Array(46+name.length);
    w32(b,0,0x02014b50);w16(b,4,20);w16(b,6,20);w16(b,8,0x0800);
    w32(b,16,checksum);w32(b,20,payload.length);w32(b,24,payload.length);
    w16(b,28,name.length);w32(b,42,offset);b.set(name,46);
    central.push(b);
    centralSize+=b.length;offset+=a.length;
  }
  const end=new Uint8Array(22);
  w32(end,0,0x06054b50);w16(end,8,entries.length);w16(end,10,entries.length);
  w32(end,12,centralSize);w32(end,16,offset);
  const result=new Uint8Array(offset+centralSize+end.length);
  let pos=0;
  for(const chunk of [...local,...central,end]) {result.set(chunk,pos);pos+=chunk.length;}
  return result;
}
function xml(value:string):string {
  return [...value].filter(char=>{
    const cp=char.codePointAt(0)!;
    return cp===9||cp===10||cp===13||(cp>=32&&cp<=0xd7ff)||
      (cp>=0xe000&&cp<=0xfffd)||(cp>=0x10000&&cp<=0x10ffff);
  }).join('').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function colName(index:number):string {
  let out='';
  for(let n=index+1;n>0;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;
  return out;
}
function parseCsv(csv:string):string[][] {
  let i=csv.charCodeAt(0)===0xfeff?1:0,quoted=false,part='',row:string[]=[];
  const rows:string[][]=[];
  const addCell=()=>{row.push(part);part='';};
  const addRow=()=>{addCell();rows.push(row);row=[];};
  for(;i<csv.length;i++){
    const ch=csv[i];
    if(ch==='"'){
      if(quoted&&csv[i+1]==='"'){part+='"';i++;}else quoted=!quoted;
    }else if(!quoted&&ch===';')addCell();
    else if(!quoted&&(ch==='\r'||ch==='\n')){
      addRow();
      if(ch==='\r'&&csv[i+1]==='\n')i++;
    }else part+=ch;
  }
  if(quoted)throw new Error('Ungültiges CSV.');
  if(part||row.length)addRow();
  return rows;
}
const types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
const rootRels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
const workbook='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Parola Export" sheetId="1" r:id="rId1"/></sheets></workbook>';
const workbookRels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';

/** Real unencrypted XLSX; caller must obtain explicit user consent. */
export function exportVaultXlsx(vault:VaultData):Uint8Array {
  const rows=parseCsv(exportVaultCsv(vault));
  if(rows.length>10_001||rows.some(row=>row.length>100))throw new Error('XLSX über Sicherheitsgrenze.');
  const sheetRows=rows.map((row,index)=>
    '<row r="'+(index+1)+'">'+row.map((cell,col)=>
      '<c r="'+colName(col)+(index+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(cell)+'</t></is></c>'
    ).join('')+'</row>').join('');
  const worksheet='<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+sheetRows+'</sheetData></worksheet>';
  const files:ZipEntry[]=[
    {name:'[Content_Types].xml',bytes:enc.encode(types)},
    {name:'_rels/.rels',bytes:enc.encode(rootRels)},
    {name:'xl/workbook.xml',bytes:enc.encode(workbook)},
    {name:'xl/_rels/workbook.xml.rels',bytes:enc.encode(workbookRels)},
    {name:'xl/worksheets/sheet1.xml',bytes:enc.encode(worksheet)}
  ];
  const result=zipStore(files);
  if(result.length>22_000_000)throw new Error('XLSX-Datei zu groß. Bitte verschlüsselten Export verwenden.');
  return result;
}
