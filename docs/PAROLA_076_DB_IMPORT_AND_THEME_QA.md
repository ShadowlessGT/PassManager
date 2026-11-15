# PAROLA 0.7.6 / VersionCode 23 – Password Safe Import und Light-Mode-Kontrast

Status: Quellcode vorbereitet im integrierten Branch `release/parola-integrated-internal-v075`. **Noch kein signierter Android-Release, kein Google-Play-Upload und kein Gerätetest**. Die Windows-Bridge war beim Fix nicht erreichbar. Produktion bleibt 0.7.4 (21), interner Test zuletzt 0.7.5 (22), solange keine Liveprüfung etwas anderes zeigt.

## Fehler aus den Android-Screenshots vom 15.11.2026

1. Password-Safe-`.db`-Import zeigte: „Die Datei ist keine unterstützte SQLCipher-4-Datenbank.“ Diese Meldung wurde durch eine Vorabprüfung `total % 4096 != 0` ausgegeben, **bevor** ein Passwortversuch mit SQLCipher stattgefunden hatte. Diese Heuristik kann nicht entscheiden, ob der Inhalt entschlüsselbar ist.
2. Sprache-Dropdown im hellen Design: Dunkler Hintergrund aus dem CSS-Fallback `--surface` bei gleichzeitig dunkel geerbter Schrift. Ähnliche Kontrastprobleme im Importkasten und einigen Formularelementen.

## Implementierte Korrekturen

- SQLCipher-Import: Kein Seitenlängen-Modulo-Test mehr; nur noch Mindestgröße (1 KiB) und Maximalgröße (100 MiB) vor dem tatsächlichen Öffnungsversuch.
- Öffnen der **verschlüsselten temporären Kopie strikt schreibgeschützt** mit `SQLiteDatabase.OPEN_READONLY` (ohne Create-/Write-Flag).
- Reihenfolge: SQLCipher-4-Standardformat, dann SQLCipher-3- und SQLCipher-2-Kompatibilitätsprofil über `SQLiteDatabaseHook.postKey`, jeweils authentifiziert durch echte Schemaabfrage. Ungültige Schlüssel/Formate erzeugen eine sachliche Fehlermeldung ohne Passwort oder SQL-Rohfehler.
- Quelle wird niemals verändert. Der verschlüsselte Android-Cache wird auch nach gescheiterten Versuchen entfernt. Kein Upload zur Cloud; das Quell-Masterpasswort bleibt auf dem Gerät.
- Die Importvorschau zeigt das erkannte SQLCipher-Quellformat. Der lokale Mapper akzeptiert nur tatsächlich gemeldete Profile 2/3/4; unbekannte Felder/Anhänge werden wie bisher mit Warnungen behandelt, ein Teilimport erfordert Bestätigung.
- Neue Datei `src/lightThemeContrast.css` wird **nach** bisherigen Themes geladen. Lesbare Hell-Dunkel-Farbkombinationen für Sprach-Dropdowns, Option-Menüs, Importkasten, Importquellenauswahl und Statistik-/Sicherheitswidgets.
- Regressionstests für die bekannten SQLCipher-Versionen und statische Theme-Kontrastschutzregeln.

## Nach dem Wiederverbinden der Windows-Bridge unbedingt erforderlich

1. Im integrierten Worktree `N:\Shadowless Studios\Apps\PassManager-Integrated-Test-v075` den GitHub-Branch `release/parola-integrated-internal-v075` **fast-forward** aktualisieren. Eigene Worktree-Änderungen vor einem Pull prüfen.
2. `npm test`, `npm run test:extension`, `npm run build`, `npx cap sync android`, `android\gradlew.bat :app:bundleRelease` ausführen. Java-Kompilierung und SQLCipher-R8-Packaging prüfen.
3. DPAPI-Keystore / Google-Firebase-Preflight prüfen; AAB `0.7.6 / versionCode 23` signieren, SHA-Fingerabdruck bestätigen und **nur internen Test** über Google Play aktualisieren.
4. Mit einer separaten Test-Parola-Datenbank die `.db`-Datei aus der **originalen Password-Safe-App** auswählen und das bisherige Passwort **ausschließlich lokal im Handy** eingeben.
5. Nach erfolgreicher Entschlüsselung Datensatzanzahl, Kategorien, Passwörter, Bilder, Zusatzfelder und TOTP/2FA mit der Original-App vergleichen. Ein „erfolgreich geöffnet“ bedeutet nicht automatisch eine vollständige Migration.
6. Falls weiter keine Entschlüsselung gelingt: **Nur** Fehlertext, Dateigröße und gegebenenfalls eine nicht vertrauliche Tabellen-/Spaltenübersicht anfordern – niemals das Masterpasswort, Klartext-Einträge oder entschlüsselte Tabellenwerte. Die Original-App bietet als sicheren Ausweichweg lokal einen CSV-Export.
7. Light- und Dark-Mode auf Android prüfen: Sprache-Dropdown einschließlich geöffneter Optionsliste, Importdialog mit deaktivierten/aktivierten Buttons, Einstellungs-Selects, Passwortmaske und Sicherheits-Dashboard.

**Keine ungeprüfte Veröffentlichung in Produktion.** Wenn reale Dateien anders verschlüsselt sind als SQLCipher 2/3/4 mit Standardeinstellungen, ist noch spezifische Format-/Schemaunterstützung nötig; dieser Fix behauptet keinen bereits bewiesenen vollständigen Import.
