# Parola Chrome + Firefox – Entwicklungsversion 0.2.0 (nicht veröffentlicht)

**Entwicklungsstand, noch nicht für echte Passwörter oder den Store freigegeben.** Der Quellcode liegt direkt im bestehenden GitHub-`main`. Es wurde **keine** Play-App, Browser-Erweiterung oder Windows-App veröffentlicht.

## Gemeinsamer verschlüsselter Tresor

Die Erweiterung nutzt dieselbe Firebase-Instanz (`password-manager-parola`), dieselben Dokumente `vaults/{uid}`, den bestehenden AES-256-GCM-Tresor und PBKDF2-SHA256 mit **600.000 Iterationen**. E-Mail/Passwort dienen nur der Firebase-Anmeldung; das **andere** Parola-Master-Passwort entschlüsselt den Cloud-Tresor im Speicher.

Beim Speichern erstellt die Erweiterung lokal einen neuen verschlüsselten Envelope. Firestore bekommt **ausschließlich** `salt`, `nonce`, `ciphertext`, Version, Iterationen, Zeitstempel und den Server-Zeitstempel. Eine Firestore-UpdateTime-Precondition verhindert das stille Überschreiben eines inzwischen von einem anderen Gerät geänderten Tresors. Bei `CLOUD_CONFLICT` nicht überschreiben, sondern neu laden und Änderungen abstimmen.

### Version 0.1 – bereits vorbereitet

- Chrome und Firefox mit Manifest V3, begrenzten Berechtigungen (`activeTab`, `scripting`, `storage` und den drei Google-API-Endpunkten).
- Kein `<all_urls>`, kein Hintergrund-Sniffer, keine ungefragte Formular-Überwachung, kein Remote-Script.
- Firebase-Anmeldung (Google-OAuth-Code vorbereitet, Client-IDs noch nicht eingerichtet; E-Mail/Passwort als Fallback), danach bewusste Entsperrung mit Master-Passwort. Firebase-Sitzung bleibt **nur im browserinternen RAM-Sitzungsspeicher**, nicht in `storage.local`.
- Das entschlüsselte Vault und der AES-Schlüssel existieren ausschließlich während der Lebensdauer des Popup-Fensters.
- „Einfüllen“ nur **nach Nutzerklick**, nur bei **exakt gleicher HTTPS-Hostname/Port-Kombination**, niemals Submit.
- **Optionaler Login-Wächter pro HTTPS-Webseite**: erst nach ausdrücklicher Webseitenfreigabe wird ein Login-Versuch beim Absenden des Formulars erkannt. Bei der folgenden Seitenänderung kann eine dezente Abfrage erscheinen. Keine automatische Speicherung; die Vorlage bleibt höchstens 2 Minuten im isolierten Browser-Sitzungsspeicher (vor der Verschlüsselung kurzzeitig Klartext im RAM). Zusätzlich bleibt der manuelle „Ausgefüllten Login erkennen“-Button verfügbar. Benutzername und Passwort werden im Popup zur Prüfung angezeigt; **erst nach erneutem ausdrücklichem Speichern** verschlüsselt nach Firestore geschrieben.
- Mehrdeutige Formulare (mehrere Passwörter), Registrierungsfelder und nicht-HTTPS-Webseiten werden zunächst abgelehnt.
- Kein Auslesen der im internen Chrome-/Firefox-Passwortmanager gespeicherten Daten. Browser stellen Erweiterungen dafür keine generelle Passwörter-Lese-API bereit. **Bestehende Einträge nur per vom Nutzer ausgelöstem CSV-Export/Import** übernehmen.

### Installieren / ausprobieren (nur Dummy-Konten)

Auf dem Windows-PC im bestehenden Parola-Repository:

```powershell
npm ci
npm run test:extension
npm run extension:build
```

Der Build übernimmt nur die öffentliche Firebase-Webkonfiguration aus der lokal ignorierten `.env.local`. Er erzeugt exakt `browser-build/chrome` und `browser-build/firefox` inklusive `manifest.json`. Der **Firebase-Web-API-Key ist clientseitige Konfiguration**, kein Admin-Dienstkontoschlüssel. Es werden keine privaten Schlüssel oder .env-Dateien kopiert.

- **Chrome:** `chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung laden“ → Ordner `browser-build/chrome`.
- **Firefox:** `about:debugging#/runtime/this-firefox` → „Temporäres Add-on laden“ → `browser-build/firefox/manifest.json`. Dauerhafte Verteilung benötigt Mozilla-Add-on-Signierung.
- Auf Android zuerst einen **Dummy-Tresor** anlegen und explizit die verschlüsselte Cloud-Sicherung hochladen. Auf einem HTTPS-Testformular anmelden, Popup öffnen, Firebase-Konto anmelden, **dasselbe Master-Passwort** eingeben. Einloggen/Test-Capture/Formular prüfen und ausdrücklich speichern. Auf Android danach **Cloud-Tresor herunterladen und prüfen**. Automatisches Pull/Push für Android/Windows ist noch nicht aktiviert.

### Noch nicht umgesetzt / Sicherheitsfreigabe

1. **Bereits als Prototyp:** Per-Domain-Freigabe, dynamische Formularbeobachtung und Speichern-Nachfrage. **Noch zu testen:** echt erfolgreicher Login, schwierige Formulare/2FA, Firefox-Hintergrundskript, Browser-Token, sichere Session-Lebensdauer. Es handelt sich um die Erkennung eines Login-Versuchs/Seitenwechsels, nicht um eine beweisbare serverseitige Anmeldung.
2. **Komfortables Entsperren** mit zeitlich begrenzter und überprüfter Sitzung statt erneuter Master-Passwort-Eingabe bei jedem Popup. Keine persistente Speicherung von CryptoKeys/Passwörtern.
3. **Konfliktfeste Gerätesynchronisierung** auf Android und Windows: aktuelle App bietet Cloud-Upload/Cloud-Download als bewusste Aktionen, noch kein automatisches Merge. Erweiterungsänderungen erscheinen nicht von selbst auf einem anderen Gerät.
4. Account-Verifizierung, App Check/Firestore REST, Verbindungsabbrüche, Session-Refresh, Schutz vor Phishing/DOM-Änderung, Lecks via Screenshots/Clipboard und Browser-Sicherheitsreview auf echten Testprofilen prüfen.
5. Vor Store-Veröffentlichung: Privacy Policy, Browser-Store-Angaben, echte Icons, Signierung und Support/Deinstallation testen.

### Benutzerberechtigungen

| Aktion | Standard | Erlaubnis |
|---|---|---|
| Webseite lesen | Aus | Manuell „Login erkennen“ oder Webseitenberechtigung für den optionalen Login-Wächter |
| Login ausfüllen | Aus | Manuell per Klick „Einfüllen“, nur exakt passende HTTPS-Domain |
| Neues Passwort nach Firebase schreiben | Aus | Explizite Bestätigung, vorher Master-Passwort |
| Alle Seiten automatisch überwachen | Aus | Kein pauschales Mitlesen; einzeln erlaubte HTTPS-Webseiten |
| Google-Konto/Browserspeicher-Passwörter auslesen | Nicht möglich | CSV-Import durch Nutzer |

**Keine echten Passwörter einsetzen, solange der komplette End-to-End-Test und unabhängige Sicherheitsprüfung fehlen.**

## Store und Google Anmeldung

Siehe [STORE_SUBMISSION.md](STORE_SUBMISSION.md). Eine Registrierung beim Chrome Web Store (einmalige Gebühr) und beim Firefox Add-ons Developer Hub ist unabhängig von Google Play erforderlich. Google OAuth-Clients müssen für jede Browser-Erweiterung eingerichtet werden. Der Store-Upload ist **noch nicht freigegeben**.

## Browser OAuth Einmal-Einrichtung

Siehe [Browser Google Store Setup](../docs/BROWSER_GOOGLE_STORE_SETUP_DE.md). Lokal: `npm run browser:oauth:report` oder PAROLA_GOOGLE_SETUP.cmd. Google Provider ist in Firebase bereits aktiv; Browser-Store-/OAuth-Clients sind noch offen.
