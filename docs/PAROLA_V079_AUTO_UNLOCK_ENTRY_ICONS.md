# PAROLA 0.7.9 / versionCode 26 – automatischer Geräte-Login und Password-Safe-Eintragssymbole

## Grundlage

Die vom Nutzer bereitgestellte originale, verschlüsselte Password-Safe-Datenbank `PasswordSafe_2026-11-15-1432.db` wurde im aktuellen Chat **lokal im Arbeitsspeicher** entschlüsselt und mit SQLCipher-HMAC-Seitenintegrität sowie SQLite `quick_check=ok` geprüft. Die Klartextdatenbank, der Schlüssel, das Master-Passwort, BLOBs, Felder und Eintragsnamen wurden **weder auf den Windows-PC noch auf GitHub übertragen oder geloggt**. Es wurden ausschließlich nicht sensible Schema- und Anzahlmetadaten betrachtet.

- `Icons` ist eine Tabelle mit `ID`, `EntryID`, `Identifier`; die 14 Zeilen referenzieren genau **14 verschiedene Passwords.ID**, ohne verwaiste Referenzen. **Keine Kategorie-Icons.**
- Neun vorkommende Symbolbezeichnungen: `house` (4), `health` (2), `account` (2), `world` (1), `twitter` (1), `mail` (1), `gaming` (1), `car` (1), `animal` (1).
- Weiteres Schema: `Passwords` 324, `Images` 93, `Categories` 24, `CategoriesColors` 24, `PasswordHistory` 399, `PwEntryElementContent` 738. `OTP`, `Passkeys`, `Attachments`, `Tombstones`, `Favorites`, `Archive` jeweils **0**.
- Passwörter und Bilder verbleiben privat: Die Quelle wurde nicht verändert.

## Neu

1. Automatischer Android-Entsperrdialog direkt **nach abgeschlossener App-Initialisierung**, wenn ein Tresor existiert, Biometrie/Gerätesperre zuvor eingeschaltet wurde und sie verfügbar ist. Höchstens ein automatischer Versuch pro App-Prozessstart; nach Abbruch oder Fehler steht das Master-Passwort weiterhin zur Verfügung. Manuelles Sperren löst keine automatische Wiederentsperrung aus. Es wird kein neuer Schlüssel oder Klartext-Mastercode gespeichert.
2. Native SQLCipher-Relationsabfrage `Icons.EntryID -> Passwords.ID` prüft vor Speicherung, dass jede Referenz existiert und eindeutig ist. Der Quellbezeichner wird optional als `VaultEntry.icon` verschlüsselt gespeichert; der Import zählt jede erkannte Verknüpfung und bricht bei Differenz ab.
3. Anzeige von neun passenden Lucide-Symbolen im Passwortlisten-Avatar und in der Detailansicht. Bilder bleiben als Anhänge erhalten und erscheinen in der Bildergalerie. Unbekannte zukünftige Icon-Bezeichner werden beibehalten, aber sicher mit Standardsymbol angezeigt.
4. Im Eintragseditor steht eine Auswahl für das persönliche Symbol zur Verfügung, auch in PAROLA Free und im Einfachmodus. Kategorien und ihre vorhandenen Kategorie-Icons bleiben völlig unabhängig.
5. Sicherungsvalidierung des verschlüsselten `.parola`-Tresors unterstützt jetzt die bereits im Vorrelease erlaubten **bis zu zwölf Bilder** und validiert optionale Eintragssymbole (maximal 64 Zeichen). Backup-Rundlauftest hinzugefügt.

## Prüfungen und Veröffentlichung

- Automatische Startentscheidungs-, Icon-Zuordnungs-, SQLCipher-Mapping- und verschlüsselte Backup-Rundlauf-Tests hinzugefügt.
- Android-Java-Kompilierung und TypeScript-/Webbuild auf Windows geprüft. Eine echte biometrische Benutzerbestätigung kann nur ein Android-Gerät liefern.
- **0.7.8 (VersionCode 25) bleibt im internen Google-Play-Test**, bis der Benutzer seinen Importtest abgeschlossen hat. **0.7.7 (VersionCode 24) bleibt in Produktion.**
- 0.7.9 (VersionCode 26) wird als neuer signierbarer Entwicklungsstand vorbereitet; nicht automatisch hochstufen oder Tests überschreiben.

## Nächster Android-Gerätetest

1. App vollständig schließen und neu starten: Nach eingerichteter Biometrie automatisch Systemdialog statt Klick auf `Mit Fingerabdruck öffnen`.
2. Dialog abbrechen: Master-Passwort muss ohne erneute Popup-Schleife verwendbar bleiben.
3. Tresor ausdrücklich manuell sperren: App darf ohne Klick nicht automatisch sofort entsperren.
4. Eine lokale Testkopie importieren; die 14 Eintragssymbole (9 Motivtypen) in Liste/Detail prüfen; 93 Originalbilder bleiben in den jeweiligen Einträgen.
5. Verschlüsselte `.parola`-Sicherung exportieren und mit separatem Test-Tresor wiederherstellen.

**Keine Secrets, lokalen Quelldaten oder Originalbilder in Versionskontrolle aufnehmen.**
