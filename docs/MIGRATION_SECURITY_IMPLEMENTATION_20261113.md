# Parola – Migration, Backup & Security (Entwicklung 2026-11-13)

**Branch:** `feat/parola-migration-security-20261113`

## Ausgangslage

- Parola-Android-Projektstand beim Start: `package.json 0.7.4`, Android `versionName 0.7.4`, `versionCode 21`.
- Die vom Nutzer genannte Versionsnummer `0.2.5` entspricht **nicht** dem Versionsstand dieses Android-Checkouts. Keine Versionsnummern wurden überschrieben oder heruntergesetzt.
- Fremdformat `PasswordSafe_*.csv`: Semikolon-/UTF-8-CSV, 31 Spalten, darunter wiederholte Kennungen für Passwörter, PINs, Kommentare, IBAN usw. Das eigentliche Nutzerbeispiel enthält 324 Zeilen. Es wurde weder in ein Repository eingecheckt noch in eine Cloud übertragen.
- Fremdformat `PasswordSafe_*.db`: kein direktes SQLite/ZIP/JSON-Format, offenbar ein proprietär verschlüsseltes Backup. Ohne Formatdefinition und Sicherungspasswort wird es ausdrücklich nicht als Parola-Datei behandelt. Der Nutzer kann aus der Quell-App CSV exportieren und diesen importieren.

## Implementiert

1. **Import-Assistent:** auswählbare Quellen (Google Passwortmanager, Password Safe, iCloud, Bitwarden, KeePass, 1Password, Samsung Pass, Dashlane, Enpass, Keeper, LastPass, NordPass, Proton Pass, RoboForm und CSV-kompatible Apps), CSV- und XLSX-Import, Vorschau, Dublettenprüfung. Doppelte Spalten werden als separate verschlüsselte Zusatzfelder gespeichert. PIN, Wiederherstellungscode und Kartennummer werden korrekt als sensible Felder eingeordnet. Fremde .db/.kdbx/.1pux erfordern Export aus Quell-App.
2. **Export:** CSV in Klartext mit BOM, Semikolon, korrektem Quoting und Schutz gegen Tabellenkalkulations-Formelinjektion; wiederholte Zusatzfelder behalten eigene Spalten. CSV enthält keine Bilder oder Passwort-Historien.
3. **Eigenes verschlüsseltes Backup:** .parola-Datei mit exakt der verschlüsselten Tresor-Hülle, inkl. Kategorien, Historien und Bildern. Vor Import sind Master-Passwort, Entschlüsselung und strukturelle Prüfung erforderlich. Import ergänzt vorhandene Daten statt sie blind zu ersetzen.
4. **Android SAF-Dateidialog:** eigener Capacitor-Java-Plugin mit `ACTION_CREATE_DOCUMENT`; kein temporärer Klartext-Dateicache. Bei CSV-Ausfuhr wird der Nutzer gewarnt, dass die Zieldatei **nicht verschlüsselt** ist. Web verwendet einen lokalen Download-Blob.
5. **Sicherheitsfunktionen:** Master-Passwort-Wechsel mit lokalem AES-GCM-Rekey und Entfernen alter lokaler Backup-Hüllen; biometrische Entsperrung wird danach deaktiviert, bis neu eingerichtet. Automatische Zwischenablage-Leerung nur, falls der kopierte Wert noch dort steht; Android kann Hintergrundtimer verzögern. Ein/Aus für Android-Screenshots, standardmäßig geschützt. Display-aus-Broadcast mit Sperre.
6. **Optionaler Selbstzerstörungsmodus:** standardmäßig AUS, nur nach Warnung und Eingabe `LÖSCHEN`; lokale Zähler (5/10/15/20 fehlgeschlagene Master-Passwort-Versuche) und Löschung von `current` sowie `previous-before-cloud-restore` im lokalen IndexedDB. **Keine** physisch garantierte Speicherlöschung, **keine** Cloud-Löschung, **kein** Schutz vor kopierter/offline entschlüsselbarer Datenbank, bei beschädigter Datenbank kann die AES-GCM-Authentifizierung ebenfalls scheitern. Vor Aktivierung Backup erstellen.
7. **Android-Backup:** `android:allowBackup=false` bleibt absichtlich unverändert (keine automatische ungeschützte Übernahme von App-/Authentifizierungszustand). Stattdessen expliziter verschlüsselter .parola-Export.
8. **Google Play DEX-Warnung:** R8-Minifizierung und Ressourcen-Shrinking nur für `release` aktiviert; fehlende optionale Facebook-SDK-Klassen der Firebase-Bibliothek ohne Aktivierung von Facebook-Login ausgeschlossen. Validierung durch Gradle Release Build. Ob die Play-Console-Analyse danach mindestens 25 % Obfuskation ausweist, lässt sich erst nach Upload eines neuen Bundles feststellen.

## Validierung

- `npm test`: 61 Tests bestanden (inkl. Migration/CSV/verschlüsseltes Backup und Sicherheits-Defaults).
- `npm run build`: TypeScript und Vite erfolgreich.
- `npx cap sync android`: generierte Android-Dateien im Worktree synchronisiert.
- `:app:compileDebugJavaWithJavac`: erfolgreich.
- `:app:assembleRelease` mit R8: erfolgreich, **unsigned APK** für technische Verifikation; kein signierter/hochgeladener Play-Release.

## Verbleibende Gerätetests / Einschränkungen

- Android SAF-Dateiauswahl und Dateirechte real auf dem Samsung-Gerät prüfen.
- Screen-Off-Ereignis, Screenshot-Toggle und Zwischenablage-Autolöschung real auf Android 13–16 prüfen.
- Mit Test-Daten: vollständige verschlüsselte Sicherung → anderes Gerät → Import → Entsperren, falsches Passwort, Dubletten, alle Felder/Bilder.
- Selbstzerstörungsmodus ausschließlich auf isolierter Test-Datenbank testen; **nie** mit echten Passwörtern.
- Bestehender Google-Play-Hinweis auf nicht unterstützte APIs/Parameter für randlose Anzeige (Android 15) ist **noch nicht verifiziert/behoben**. Er benötigt ein separates SDK-/UI-Audit.
- Die echte Google-Play-Obfuskationsquote kann erst der Store nach dem Upload neu bewerten.
- Kein Merge nach `main`, keine Firebase-Änderung und kein Deployment. Laufende App-Version bleibt unberührt.
