import { Capacitor, registerPlugin } from '@capacitor/core';

type DocumentExporter = {
  saveDocument(options: { filename: string; mimeType: string; contents: string; encoding?: 'utf8' | 'base64' }): Promise<{ uri: string }>;
};

const NativeDocument = registerPlugin<DocumentExporter>('ParolaDocumentExport');

/** User explicitly chooses the destination via Android Storage Access Framework.
 * Plaintext CSV is never written to temporary app storage in the native flow.
 */
export async function saveUserExport(filename: string, mimeType: string, contents: string): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    await NativeDocument.saveDocument({ filename, mimeType, contents });
    return;
  }
  const blob = new Blob([contents], { type: mimeType + ';charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.append(anchor);
  try { anchor.click(); }
  finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 45_000);
  }
}

/** Binary export with Android's own SAF picker, no plaintext temporary file. */
export async function saveUserBinaryExport(filename:string,mimeType:string,data:Uint8Array):Promise<void>{
  if (data.length > 22_000_000) throw new Error('Exportdatei zu groß.');
  if (Capacitor.getPlatform() === 'android') {
    // Convert using small chunks to avoid stack overflows on large vaults.
    const chunks:string[]=[];
    for (let offset=0;offset<data.length;offset+=8192) {
      const part=data.subarray(offset,Math.min(offset+8192,data.length));
      chunks.push(String.fromCharCode(...part));
    }
    await NativeDocument.saveDocument({filename,mimeType,contents:btoa(chunks.join('')),encoding:'base64'});
    return;
  }
  const blob=new Blob([new Uint8Array(data).buffer],{type:mimeType});
  const link=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=link;a.download=filename;document.body.append(a);
  try {a.click();}
  finally{a.remove();window.setTimeout(()=>URL.revokeObjectURL(link),45_000);}
}
