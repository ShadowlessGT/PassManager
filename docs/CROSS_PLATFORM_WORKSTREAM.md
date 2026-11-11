# Parola Multi-Platform – gemeinsamer Windows-/Android-/Browser-Tresor

**Stand 11.11.2026 – Entwicklung auf `main`, keine Veröffentlichung.**

## Ziele

Eine Parola-Identität, ein Master-Passwort und **ein verschlüsseltes Firebase-Tresordokument** für Android, Windows, Chrome und Firefox. Kein neues Backend, keine separate User-Datenbank. Niemals Klartext-Kennwörter, Master-Passwort oder Kryptoschlüssel an Firebase, Hostinger oder Browser-Sync senden.

**Grenze:** Eine gemeinsame Firebase-Datenbasis ist bereits vorhanden, **vollautomatische bidirektionale Synchronisierung** der Android-/Windows-Clients noch nicht. Bis zum Konflikt-/Offline-Sync-Review nur explizite Cloud-Upload/-Download-Aktionen mit sichtbaren Hinweisen verwenden.

## Entwicklungspakete (vorbereitet)

| Thema | Code | Status |
|---|---|---|
| Gemeinsamer Tresor | `src/types.ts`, `src/crypto.ts`, `src/cloud.ts`, `src/cloudSafety.ts` | Vorhanden |
| Windows-Shell | `desktop/src-tauri` | Tauri 2 angelegt, Build/Windows-QA offen |
| Chrome & Firefox | `extensions/browser`, `extensions/shared` | MV3-Entwicklungscode, nicht installiert/veröffentlicht |
| Lokale Browser-Builds | `BUILD_EXTENSIONS.cmd` / `npm run extension:build` | Implementiert, auf echtem PC auszuführen |
| Verschlüsselter Cloud-Schreibweg aus Erweiterung | `extensions/shared/firebase-rest.mjs` | Implementiert, echte Firestore-E2E-Prüfung ausstehend |
| Formfelder nur auf Nutzerklick auslesen und einfüllen | `extensions/browser/popup.mjs` | Implementiert, Browser-QA ausstehend |
| Formularnachricht nach Login, optional automatische Speicherbestätigung | Noch nicht implementiert | Nächster sicherheitsrelevanter Arbeitsschritt |
| Synchronisierung ohne manuelles Upload/Download | Noch nicht implementiert | Eigenes Arbeitspaket |

## Priorität 1 – Sicherheitsgrundlagen / Testen

- [ ] `npm test` und `npm run test:extension` auf dem Windows-PC ausführen; mit falschem Master-Passwort und beschädigten Ciphertexts testen.
- [ ] `npm run extension:build` ausführen; Chrome/Firefox in einem **neuen Testprofil** laden, keine echten Kontodaten.
- [ ] Auf Android mit **Dummy-Vault** eine verschlüsselte Cloud-Sicherung hochladen, in Chrome/Firefox mit gleichem Firebase-Konto und Master entsperren.
- [ ] Auf HTTPS-Testformular Login manuell erkennen, **Vorschau bestätigen**, in Firebase schreiben, auf Android herunterladen und Inhalt vergleichen.
- [ ] Mehrgeräte-Schreibkonflikt erzwingen; das zweite Gerät muss abbrechen, statt ein neues Passwort zu überschreiben.
- [ ] Phishing-Grenzen prüfen: `example.com.evil.test`, HTTP, Subdomains, mehrere Passwortfelder, Login- und Registrierungsformulare.
- [ ] Firebase App Check und Firestore REST-Kompatibilität anhand echter Testnutzer prüfen, bevor App-Check-Enforcement verschärft wird.
- [ ] Vollständiger Security-Review inkl. Firefox/Chrome Manifest, Token-Speicher und Cross-Origin-DOM-Injektion.

## Priorität 2 – Komfortabel und optional automatisch

- [ ] **Per Domain abschaltbare Opt-in-Erkennung** nach erfolgreichem Login. Nur individuell autorisierte HTTPS-Hosts; niemals global `<all_urls>` ohne klare Nutzerfreigabe.
- [ ] Einblendung „Passwort für diese Webseite in Parola speichern?“ mit **Speichern / Nie für diese Domain / Nicht jetzt**. Passwort muss vor dem Speichern lokal verschlüsselt werden. Keine persistente Klartextwarteschlange.
- [ ] Zusätzliche Einträge mit gleichem Host/Benutzer korrekt unterscheiden; Aktualisieren bestehender Passwörter nur mit Bestätigung.
- [ ] Zeitlich begrenzte Schlüsselhaltung: Unlock mit Master, sperren bei Browser-Neustart/Timeout, kein Kryptoschlüssel in `storage.local` oder Firebase.
- [ ] Passwortgenerator in der Erweiterung, einfüllen/aktualisieren ohne automatische Formularübermittlung.
- [ ] Optional native Messaging zur Windows-App statt separatem Passwort-Entsperren je Popup – nur per registriertem Host, signierter App und gepaarter Extension-ID.
- [ ] Bereits in Chrome/Firefox gespeicherte Logins **vom Nutzer exportieren** und über Parolas vorhandenen CSV-/XLSX-Import übernehmen. Kein versteckter Zugriff auf den Browser-Passwortspeicher.

## Priorität 3 – Richtige Synchronisierung

- [ ] Pro Datensatz stabile ID/Änderungsstand, sichere Konflikt-Erkennung und sichtbare Auflösung implementieren; nicht einfach „last writer wins“.
- [ ] Verschlüsselte Änderungen und Offline-Warteschlange: kein Verlust bei fehlender Netzwerkverbindung, keine doppelten Einträge.
- [ ] Automatische Pull-/Push-Synchronisierung opt-in mit Retry/Backoff; Updates zwischen Android, Desktop und Erweiterung erscheinen nach erfolgreicher Sync ohne manuelle Cloud-Wiederherstellung.
- [ ] Löschen, Passwort-Historie, Dateianhänge, Kategorien, Personen und Premium-Limits über Plattformen kompatibel halten.
- [ ] Konto- und Geräteabmeldung, Widerruf verlorener Geräte, eventuell Schlüsselrotation sicher planen.
- [ ] E2E-Tests für Erstinstallation, Gerätewechsel, Alt-Tresore und fehlerhafte Netzwerke.

## Priorität 4 – Windows-/Store-Release

- [ ] Windows-Toolchain Rust, MSVC, WebView2 installieren/prüfen; `BUILD_DESKTOP.cmd` ausführen.
- [ ] Sperrbildschirm, OS-Screenshot-/Clipboard-Schutz und lokales Speichermodell prüfen; später optional Windows Hello.
- [ ] Windows-Symbol, verifizierter Codesigning-Schlüssel und signierter NSIS-/MSI-Installer samt sicheren Updates.
- [ ] Chrome Web Store/Firefox AMO: Icons, Datenschutzdeklarationen, Veröffentlichungspaket, Review und Store-Signierung.
- [ ] Android-Versionskompatibilität, Firebase-Rules und Release-OTA getrennt prüfen; kein ungeprüftes Remote-Update an einen Passwortmanager ausrollen.

## Bestehenden Android-Produktionsstand nicht gefährden

Die neuen Dateien leben in getrennten `desktop/`- und `extensions/`-Ordnern. Keine Änderung an Android-Datenformat, Play-Produkt, Google Play Track, Firebase-Regeln, Firebase Functions, Hostinger-OTA oder Parola-Webseite ist nötig. Die mobilen Tresordaten werden **nicht** migriert, solange die Tests offen sind.
