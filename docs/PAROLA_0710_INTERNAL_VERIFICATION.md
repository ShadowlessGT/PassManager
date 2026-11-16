# Parola 0.7.10 (VC 27) – interner Billing-Test, 16.11.2026

- Quellstand aus `main` 0.7.9 / VC26; neuer Build 0.7.10 / VC27.
- Neue Bilder und Anhänge sind nur mit Parola Ultra hinzufügbar. Bestehende importierte Bilder bleiben in Free lesbar und löschbar.
- Ultra-Kauf und Geschenkcode-Einlösung sind jetzt auch im einfachen Modus erreichbar; aktive Lizenzen verhindern wiederholtes Kaufen.
- Google Play One-Time-Product `parola_ultra_lifetime` wurde für 174 Regionen aktiviert (`standard`: ACTIVE). Deutschland: einmalig 4,99 EUR.
- Das verifizierte Firebase-Konto `tamergt@googlemail.com` hat `passmanagerAdmin=true`; existing claims wurden erhalten.
- Neue Firebase Callable `billingReadiness` in `europe-west3`: ACTIVE. Der Kaufbutton wird erst freigegeben, wenn die echte Cloud Functions Runtime-ID Kaufprüfzugriff auf Google Play hat. Unautorisierter/offline Zustand sperrt Kauf.
- Firebase Runtime `693424731365-compute@developer.gserviceaccount.com` ist jetzt als Google Play Nutzer ausschließlich für `com.shadowlessstudios.passwordmanager` eingetragen. Per API rückgelesene Rechte: `CAN_VIEW_FINANCIAL_DATA`, `CAN_MANAGE_ORDERS` plus app-begrenzte Play-Standardleserechte; **keine** globalen Entwicklerkonto-Rechte.
- Entwickler-Verwaltung via zentralem Dienstkonto `shadowless-studios@pc-api-7037015735668259460-768.iam.gserviceaccount.com` ausgeführt; keine JSON-Keys angelegt.
- 101 App-Tests und 13 Backend-Tests bestanden, Web-/Android-Build und AAB-Signatur erfolgreich.
- AAB `Parola-v0.7.10-vc27-SIGNED.aab`, SHA256 `4993091ccdc70be646d5df8b00ed4a184984cfcf9c7bc125150250c3e7d4660d` wurde von Google Play angenommen und **ausschließlich dem internen Test zugewiesen**.
- API-Readback: intern VC27, offener Test VC20, Produktion VC24 unverändert.

## Restliche Abnahme

1. App über Google Play mit freigeschaltetem internen Tester-Konto installieren. Bei erstem `billingReadiness`-Aufruf kann die Rechteausbreitung verzögert sein.
2. Im einfachen Modus Ultra-Preis, Geschenkcode-Panel und Admin-Schaltfläche prüfen. Nach Änderungen an Custom Claims neu anmelden oder Token erneuern.
3. **Lizenztester** in der Google Play Console aktivieren und einen echten Play-**Testkauf** mit Test-Zahlungsmethode ausführen. Keine echte Zahlung in QA.
4. Firebase Entitlement, Kaufwiederherstellung, Pending/Abbruch/Erstattung sowie Bild-Upload Free vs Ultra auf einem echten Gerät prüfen.
5. App Check/Play Integrity und automatisierte Erstattungsbenachrichtigungen sind vor breiter Produktivfreigabe separat zu härten. Keine öffentliche Freigabe ohne E2E.

**Hinweis:** Die Build-Flag `VITE_PLAY_BILLING_ENABLED=true` ist in `.env.local` des separaten internen Test-Worktrees gesetzt, nicht im Git gespeichert. Beim nächsten Build diese Einstellung kontrollieren. Ein öffentliches Release wurde hier nicht ausgelöst.
