# Parola – Branch-Audit und Google-Play-Teststatus (2026-11-15)

## Autoritativer Entwicklungsstand

**GitHub `main`** wurde am 15.11.2026 ohne Force-Push per Fast-Forward auf `bf0dda938da0b0ce498e6c29481d80f57f076344` (Parola 0.7.6, VersionCode 23) aktualisiert. Das Hauptverzeichnis `N:\Shadowless Studios\Apps\PassManager` wurde auf `main` umgeschaltet.

Die vorherige Version von `main` (`420be87`) ist ein Vorfahr des neuen Stands. Der gesamte Commit-Verlauf bleibt erhalten.

### Vergleich vorhandener lokaler Entwicklungsbranches mit 0.7.6

| Branch | Vergleich zu main | Entscheidung |
|---|---|---|
| `feat/parola-google-signin-v073` | vollständig enthalten | historisch |
| `fix/parola-google-signin-play-cert-v074` | vollständig enthalten | historisch |
| `feat/parola-browser-oauth-setup` | vollständig enthalten | historisch |
| `feat/parola-store-branding` | vollständig enthalten | historisch |
| `feat/parola-migration-security-20261113` | vollständig enthalten | historisch |
| `feat/parola-security-ux-20261113` | vollständig enthalten | historisch |
| `feat/parola-passwordsafe-sqlcipher-import-20261113` | vollständig enthalten | historisch |
| `release/parola-integrated-internal-v075` | vollständig enthalten | historischer interner Release |
| `feat/parola-new-logo-v076` | identisch mit Stand von main vor diesem Audit | Release-Marke 0.7.6 |
| `feat/parola-browser-shared-google-login` | **nicht vollständig enthalten**; 1 nicht integrierter Feature-Commit `c099cbe` (zusätzlich ein Merge-Commit) | **Experiment**, nicht für Android-Produktion freigeben |

Der separat entwickelte Browser-Login-Prototyp enthält eine neue verschlüsselte Google-Auth-Handoff-Technik (Webextension + Website), deren echtes Login-Verhalten in Chrome und Firefox noch nicht End-to-End validiert wurde. Das Zusammenführen vor dem Test könnte den vorhandenen Browser-Login-Code verändern. Er ist bewusst nicht in dem produktiv freigegebenen Android-Stand.

### Arbeitsordner und Git-Sicherheit

Am 15.11.2026 wurden alle 9 vorhandenen Git-Worktrees kontrolliert: **keine uncommitteten Änderungen**. Die historischen Worktrees/Branches werden erst nach gesonderter Prüfung ihrer ignorierten Dateien (lokale Umgebungsdateien, Build-Ausgaben, mögliche Junctions) gelöscht, damit keine privaten Daten oder andere Arbeitsstände verloren gehen.

## Live Google Play Developer API

Am 15.11.2026 gegen 04:33 Uhr deutscher Zeit meldete Google Play:

| Track | VersionCode | Version | Status |
|---|---:|---|---|
| `internal` | 23 | 0.7.6 | `completed` |
| `beta` | 20 | 0.7.3 | `completed` |
| `production` | 23 | 0.7.6 | `completed` |

**Achtung:** Die Produktion hat nun ebenfalls 0.7.6. Die Promotion auf den Produktions-Track war bereits erfolgt, bevor diese Abfrage gemacht wurde. Dieser Audit-Vorgang hat keine Play-Tracks geändert.

## Warum Nutzer die interne Testversion nicht erhalten können

Google Play verlangt für den internen Test **beides**: (1) Zugehörigkeit zu einer in der Play Console ausgewählten Tester-E-Mail-Liste/Google-Gruppe und (2) aktive Teilnahme über den Opt-in-Link. Gleiche VersionCodes für intern und Produktion liefern **kein separates Versions-Update**.

Der offizielle API-Endpunkt `edits.testers.get` meldete für `internal` **0 Google Groups**. Das beweist **nicht**, dass keine einzelnen E-Mail-Testerlisten existieren, denn die Developer API kann E-Mail-Listen der Play-Console-Oberfläche weder anzeigen noch verwalten.

Zum Prüfen ohne Browserautomation:
1. In Play Console **Parola > Testen > Interner Test > Tester** kontrollieren, welche E-Mail-Liste ausgewählt ist und ob das auf dem Android-Gerät verwendete Google-Konto dazu gehört.
2. Den von Play Console ausgegebenen offiziellen Tester-Teilnahmelink mit diesem Konto öffnen und dem Test aktiv beitreten.
3. Bei gleicher Version 23 im internen und Produktions-Track erscheint kein anderes AAB/Update. Geräteinstallation direkt über Google Play und Version 0.7.6 prüfen.

## Weitere offene Qualitätsthemen
- Password Safe `.db`-Entschlüsselung und vollständige Übernahme inklusive Sonderfeldern/Bildern/2FA sind nicht mit einer echten Datenbank auf einem Testgerät nachgewiesen.
- Edge-to-edge-Android-15-Warnung weiter separat prüfen.
- Die alte und neue Google Play Store-Listing-Grafik ist unabhängig von der aktualisierten Launcher-Grafik und muss getrennt im Store geändert werden.

Es wurden beim Audit weder Produktionsdaten, Firebase-Bestände noch Google-Play-Testerlisten verändert.
