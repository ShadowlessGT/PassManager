import { Capacitor, registerPlugin } from '@capacitor/core';

type DocumentExporter = {
  saveDocument(options: { filename: string; mimeType: string; contents: string }): Promise<{ uri: string }>;
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
