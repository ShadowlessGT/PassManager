# PAROLA 0.7.5 (22) – Produktionsfreigabe-Prüfung, 15.11.2026

## Quelle und aktuell veröffentlichte Versionen

- Repository: `ShadowlessGT/PassManager`.
- Integrierter Release-Branch: `release/parola-integrated-internal-v075`, Git-Stand vor diesem Bericht `5a33475`.
- Build-Commit: `2879c47`, `0.7.5 / versionCode 22`.
- Google Play: **Produktion 0.7.4 (21)**, **offener Test 0.7.3 (20)**, **interner Test 0.7.5 (22)**.
- Signiertes AAB: `tools/play-release/out/Parola-v0.7.5-vc22-SIGNED.aab`
- SHA-256: `21e20b72832589e4cfbdfbbef39e5e1258ce04687bd3d47c45065ee5ef2e9003`.
- Upload-Zertifikat der bisherigen PAROLA-Play-Version bestätigt. Android-Bundle enthält native SQLCipher-Bibliotheken für vier ABIs.

## Integrierte Features, aber noch nicht öffentlich

- Sicherheitscenter, Passwort-Statistiken, Archiv/Papierkorb, Eintragsaktionen.
- Verschlüsseltes `.parola`-Backup, CSV-/XLSX-Import und Export; lokale automatische verschlüsselte Wiederherstellungspunkte.
- Password-Safe-`.db`-Import durch native SQLCipher-4-Dateiöffnung und lokale Konvertierung mit Warnungen bei nicht erkannten Feldern und Tabellen.
- Masterpasswortwechsel, Sicherheitsoptionen für Zwischenablage/Display/Screenshots, optionaler Selbstzerstörungsmodus (Standard AUS).
- Unterordner/Tags, Kategorieansichten und Designoptionen; Browser-Add-on-Branding und OAuth-Einrichtungsvorbereitung.
- Bereits gemergt: `feat/parola-migration-security-20261113`, `feat/parola-security-ux-20261113`, `feat/parola-passwordsafe-sqlcipher-import-20261113`, Browser-Branding/OAuth-Setup.

## Automatisiert bestätigt

- 79/79 App-Tests bestanden, erneut am 15.11.2026 ausgeführt.
- 20/20 Browser-Erweiterungstests bestanden, erneut am 15.11.2026 ausgeführt.
- TypeScript/Vite Produktionsbuild erneut erfolgreich.
- Signed AAB verifiziert, native SQLCipher-`.so`-Bibliotheken im AAB vorhanden.
- Google-Play-API-Test für einen Production-Release von VersionCode 22 bestanden. Test-Edit anschließend gelöscht, **kein Commit und keine Produktionsfreigabe** ausgeführt.

## Freigabeblocker / noch nicht nachgewiesen

**Kritisch: Keine echte End-to-End-Validierung der konkreten alten SQLCipher Password-Safe-Datenbank.**
Das Passwort und die Daten bleiben auf dem Gerät. Synthetische Mapper-Tests belegen nicht, dass das proprietäre tatsächliche Tabellenschema, Kategorien, Anhänge, Bilder, TOTP/2FA und Zusatzfelder vollständig erkannt werden. Ein Teilimport ist möglich, erfordert bewusste Nutzerzustimmung und ist noch nicht als vollständig zertifiziert.

Vor öffentlicher Freigabe von 0.7.5 auf einem isolierten Android-Test-Tresor prüfen:
1. Installation als Update auf den vorhandenen PAROLA-Tresor; vorher `.parola`-Backup exportieren und sicher aufbewahren.
2. Lokalen Password-Safe-`.db`-Import auf dem Android-Gerät mit altem Masterpasswort durchführen. **Eintragsanzahl und sämtliche wichtigen Feldtypen/Bilder/2FA** mit der Original-App vergleichen; dabei keine geheimen Daten oder Passwörter in Chat oder Logs geben.
3. `.parola`-Backup exportieren und **auf einem separaten Test-Tresor** wiederherstellen; korrekter und falscher Quell-Mastercode, Dubletten und fehlende Felder testen.
4. CSV/XLSX-Rundlauf, Archiv/Papierkorb/Wiederherstellung, Rekey mit Masterpasswortwechsel, Biometrie und Display-Sperre testen.
5. Selbstzerstörungsmodus ausschließlich mit einem separaten Wegwerf-Tresor und verfügbarem Backup testen.
6. Nach Gerätenachweisen Produktion und Store-Text/Datensicherheit abgleichen; dann erst bewusst promoten.

Noch **nicht** in 0.7.5 abgeschlossen: Android-Autofill, echte automatische bidirektionale Cloud-Synchronisierung, geschützter PDF-Export, externe automatische Hintergrund-Backups und der ungeprüfte Browser-Google-Login-Prototyp `feat/parola-browser-shared-google-login`. Diese Funktionen dürfen nicht als freigegeben beschrieben werden.

## Entscheidung

**15.11.2026:** Kein Produktions-Promote ausgeführt. Google Play ist technisch bereit, aber sicherheitskritische Gerätetests fehlen als überprüfbare Nachweise. Bestehende Production (21), Beta (20) und Internal (22) unverändert. Dieser Bericht enthält keine Benutzerpasswörter.
