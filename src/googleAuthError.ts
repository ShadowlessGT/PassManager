/** Safe, user-facing Google sign-in diagnostics. Never expose raw OAuth errors or tokens. */
export function googleSignInErrorText(error: unknown): string {
  const source = typeof error === 'object' && error !== null ? error as { code?: unknown; message?: unknown } : {};
  const code = typeof source.code === 'string' ? source.code : '';
  const details = typeof source.message === 'string' ? source.message : '';
  const signal = (code + ' ' + details).toLowerCase();

  if (/cancel|canceled|cancelled|popup-closed|12501/.test(signal)) {
    return 'Google-Anmeldung abgebrochen. Du kannst die Anmeldung jederzeit erneut starten.';
  }
  if (/network|offline|unavailable|timeout/.test(signal)) {
    return 'Keine Verbindung zur Google-Anmeldung. Bitte Internetverbindung prüfen und erneut versuchen.';
  }
  if (/operation-not-allowed|provider-disabled/.test(signal)) {
    return 'Google-Anmeldung ist in Firebase derzeit nicht aktiviert.';
  }
  if (/developer_error|developer error|apiexception:\s*10|\b12500\b|\bstatus 10\b|\bapi_exception: 10\b/.test(signal)) {
    return 'Google-Anmeldung konnte die Android-App nicht verifizieren (Konfigurationsfehler 10).';
  }
  if (/account-exists-with-different-credential/.test(signal)) {
    return 'Für diese E-Mail existiert bereits ein anderes Anmeldeverfahren. Bitte zunächst mit der bisherigen Methode anmelden.';
  }
  if (/auth\/invalid-credential|invalid_idp_response/.test(signal)) {
    return 'Google hat die Anmeldung nicht bestätigt. Bitte erneut versuchen.';
  }

  const safeCode = /^[a-zA-Z][a-zA-Z0-9/_-]{1,55}$/.test(code) ? ` (Fehlercode: ${code})` : '';
  return `Google-Anmeldung fehlgeschlagen${safeCode}. Bitte erneut versuchen oder den Fehlercode melden.`;
}
