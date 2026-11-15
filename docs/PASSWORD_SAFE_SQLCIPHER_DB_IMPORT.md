# Parola – Direkter Import verschlüsselter Password-Safe-Datenbanken

Entwicklungsbranch: `feat/parola-passwordsafe-sqlcipher-import-20261113`

## Herkunft und technische Identifikation

Die hochgeladene Sicherung `PasswordSafe_2026-11-13-1859.db` ist ca. 19,5 MB groß, hochentropisch, ohne lesbare SQLite-Kopfzeile und exakt durch 4096 teilbar. Dies passt zu verschlüsselten SQLite-Seiten, beweist alleine noch keinen korrekten Schlüssel und kein bestimmtes SQLCipher-Datenbank-Schema.

Das Produkt „Password Safe und Manager“ (`com.reneph.passwordsafe`) verwendet laut veröffentlichter technischer Dokumentation SQLCipher 4 / AES-256 / PBKDF2-HMAC-SHA512 mit 256.000 Iterationen. Diese Angaben sind extern verifiziert, die konkrete Sicherung ist noch **nicht** erfolgreich entschlüsselt worden.

Hersteller: https://passwordsafe.app/help.html und https://passwordsafe.app/
SQLCipher Community Android: https://www.zetetic.net/sqlcipher/sqlcipher-for-android-community/

## Implementierung

- SQLCipher Community für Android 4.20.0 und AndroidX-SQLite 2.7.0.
- `ParolaPasswordSafeDbPlugin` öffnet Android `ACTION_OPEN_DOCUMENT`, kopiert **nur verschlüsselte** Daten kurzzeitig in den privaten Android-Cache, öffnet diese Kopie mit dem vom Nutzer lokal eingegebenen Master-Passwort und der SQLCipher-Engine. Der Originaldatenbestand bleibt unverändert; die Cache-Kopie wird danach gelöscht.
- Prüft Entschlüsselbarkeit durch Abfrage der SQLCipher-Datenbank-Metadaten, liest mit `PRAGMA query_only`, begrenzt Größe / Anzahl / Antwortdaten.
- Liefert erkannte Eintrags-Tabellen, Spalten, Werte und Metadaten an die lokale Parola-App, ohne Passwort oder Klartext-Datei an Firebase oder einen anderen Dienst zu senden.
- Web-/Android-Importdialog mit lokalem Passwortfeld, Auswahl der `.db`-Datei, entschlüsselter Vorschau, Dublettenfilter und bewusster Importbestätigung.
- Bekannte Spalten werden Parola-Feldern zugeordnet, unbekannte Spalten als verschlüsselte Zusatzfelder erhalten.
- Nicht automatisch erkannte Tabellen, Dateianhänge und Binärdaten werden als **Warnungen** angezeigt, und ein teilweiser Import erfordert eine ausdrückliche Bestätigung.
- Wenn keine Einträge erkennbar sind, erscheint nur die **Tabellen-/Spaltenstruktur** zur künftigen Mapper-Anpassung; es wird kein falscher Erfolg vorgetäuscht.
- Auf Desktop/Web weiterhin CSV/XLSX verwenden; der direkte `.db`-Import ist vorerst Android-nativ.

## Sicherheit und Einschränkungen

- **Master-Passwort erforderlich:** Ohne das Originalpasswort ist kein legitimes Entschlüsseln möglich, und es gibt keine Hintertür.
- Die SQLCipher-Integration und Konvertierung sind per Compiler und synthetischen Unit-Tests geprüft. Eine echte Entschlüsselung der bereitgestellten 19,5-MB-Datei wurde **nicht** getestet; das Master-Passwort liegt dem Entwicklungssystem nicht vor und darf nicht über Chat, Logs, Git oder Firebase gesendet werden.
- Das exakte Passwort-Safe-Tabellenschema (inkl. kategorisierter Zusatzfelder, Passwort-Historien, Passkeys, TOTP und Anhänge) bleibt unbekannt. Nach einem lokalen Entschlüsselungsversuch auf einem Testgerät die **nicht vertrauliche Schemaübersicht** verwenden, um einen vollständigen Mapper zu entwickeln.
- Ein DB-Import ist nie als vollständig bestätigt, solange nicht die Eintrags- und Anhänge-Anzahl mit der Original-App abgeglichen wurde.
- Keine Änderungen an Play Console, Firebase, bestehenden Tresoren oder aktiven Veröffentlichungen.

## Lokaler Testablauf

1. Auf dem Android-Gerät in der **Original-App** vor dem Test ein weiteres verschlüsseltes Backup erstellen.
2. Parola mit einer **separaten Test-Datenbank** starten, nicht mit produktiven Zugangsdaten.
3. Einstellungen → Passwörter aus anderer App importieren → Password Safe → Master-Passwort von Password Safe **lokal** eingeben → verschlüsselte `.db` auswählen.
4. Bei erfolgreicher Entschlüsselung Eintragszahl und Felder prüfen, insbesondere Sonderfelder und Bilder.
5. Alle Warnungen zur möglichen Teilübernahme ernst nehmen; erst auf Testdaten importieren.
6. Bei unbekanntem Schema nur Tabellen-/Spaltennamen ohne Datensätze/Passwörter für den nächsten Mapper-Schritt bereitstellen.

## Prüfschritte

- `npm test`, `npm run build`, `npx cap sync android`, `:app:compileDebugJavaWithJavac`
- `:app:assembleRelease` mit R8 und SQLCipher-DLL/AAR: erfolgreich (technischer unsigned APK Build).
- Keine GitHub Actions.
