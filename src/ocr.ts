import { blankEntry, makeField } from './types';
import type { VaultEntry } from './types';

export type OcrDraft = Pick<VaultEntry, 'title' | 'username' | 'password' | 'email' | 'website'> & { pin: string; raw: string };

function clean(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '').slice(0, 1000);
}

export function parseRecognizedCredentials(text: string): OcrDraft {
  const draft: OcrDraft = { title: '', username: '', password: '', email: '', website: '', pin: '', raw: text.slice(0, 12000) };
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const keys: {pattern: RegExp; target: keyof OcrDraft}[] = [
    {pattern:/^(?:benutzername|user(?:name)?|login(?:[\s-]?name)?|konto(?:name)?|nickname|nutzername)$/iu,target:'username'},
    {pattern:/^(?:passwort|password|pwd|kennwort|parola|şifre|sifre)$/iu,target:'password'},
    {pattern:/^(?:email|e[\s-]?mail(?:[\s-]?adresse)?|mail)$/iu,target:'email'},
    {pattern:/^(?:url|web(?:site)?|homepage|link|domain)$/iu,target:'website'},
    {pattern:/^(?:pin|geheimzahl|zugangs[\s-]?pin)$/iu,target:'pin'},
    {pattern:/^(?:name|dienst|service|anbieter|app)$/iu,target:'title'}
  ];
  for (let i=0; i<lines.length; i++) {
    const match = lines[i].match(/^([^:：=]{2,30})\s*[:：=]\s*(.*)$/u);
    if (match) {
      const known = keys.find(k => k.pattern.test(match[1].trim()));
      if (known) {
        const val = clean(match[2] || '');
        if (val && !draft[known.target]) {
          if (known.target !== 'pin' || /^\d{3,16}$/u.test(val)) draft[known.target] = val;
        }
      }
    }
  }
  // OCR often puts a form label and the value on separate lines.
  // Accept only known labels and only when the next line does not look like
  // another known label; never invent secret values from free text.
  for (let i = 0; i < lines.length - 1; i++) {
    const known = keys.find(k => k.pattern.test(lines[i].replace(/[:：=]$/u, '').trim()));
    if (!known || draft[known.target]) continue;
    const candidate = clean(lines[i + 1]);
    if (!candidate || keys.some(k => k.pattern.test(candidate)) || /^[•●*]{3,}$/u.test(candidate)) continue;
    if (known.target === 'pin' && !/^\d{3,16}$/u.test(candidate)) continue;
    draft[known.target] = candidate;
  }
  // Conservative fallback for unambiguous email and URL only. Password/PIN
  // are never inferred from random text because OCR can misread characters.
  if (!draft.email) {
    const found = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu);
    if (found) draft.email = found[0];
  }
  if (!draft.website) {
    const found = text.match(/https?:\/\/[^\s"'<>]+/iu);
    if (found) draft.website = found[0].replace(/[.,;]+$/u, '');
  }
  if (!draft.title && draft.website) {
    try { draft.title = new URL(draft.website).hostname.replace(/^www\./u, ''); } catch { /* optional */ }
  }
  return draft;
}

export function ocrToNewEntry(draft: OcrDraft): VaultEntry {
  const result = blankEntry();
  result.title = draft.title.trim();
  result.username = draft.username.trim();
  result.email = draft.email.trim();
  result.password = draft.password;
  result.website = draft.website.trim();
  result.fields = draft.pin ? [makeField('PIN', 'pin', draft.pin)] : [];
  result.passwordChangedAt = draft.password ? Date.now() : undefined;
  // Raw OCR text is transient by default; do not accidentally store extra secrets.
  return result;
}
