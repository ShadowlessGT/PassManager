# Parola 0.7.5 – interner Google-Play-Test bestätigt

**Datum:** 2026-11-15 (Europe/Berlin)
**Android-Paket:** `com.shadowlessstudios.passwordmanager`
**VersionName:** `0.7.5`
**VersionCode:** `22`
**Integrierter Branch:** `release/parola-integrated-internal-v075`
**Quellcode-Commit (Build):** `2879c47f4a17794e952a225af99b1e4139156952`

## Erfolgreicher Ablauf

- Google/Firebase-Preflight: zwei Android OAuth-Clients, registrierte Upload- und Play-Signing-Zertifikate und Google-Provider bestätigt.
- 79 App-Vitest-Tests, 20 Extension-Node-Tests, drei Store-Setup-Node-Tests bestanden.
- TypeScript-Vite-Build und Android Gradle `:app:bundleRelease` erfolgreich, inklusive R8.
- Upload-Schlüssel per verschlüsseltem lokalem DPAPI-Keystore geladen; Signatur des AAB geprüft und mit bisherigem Parola-Upload-Zertifikat abgeglichen.
- AAB `tools/play-release/out/Parola-v0.7.5-vc22-SIGNED.aab` mit SHA-256
  `21e20b72832589e4cfbdfbbef39e5e1258ce04687bd3d47c45065ee5ef2e9003` hochgeladen, API-Readback bestätigt.
- Release **ausschließlich zum internen Test-Track** zugewiesen und über die Google Play Developer API erneut abgefragt.
- API-Bestätigung `INTERNAL_TEST_RELEASE_CONFIRMED=TRUE` und `OPEN_TEST_AND_PRODUCTION_UNCHANGED=TRUE`.

## Tracks nach dem Upload

| Track | VersionCode | Status |
|---|---:|---|
| **Internal** | **22** | bestätigt |
| Beta / offener Test | 20 | unverändert |
| Production | 21 | unverändert |

Google Play hatte VersionCode 21 bereits vor diesem Vorgang mit Status `completed` in der Produktion. Es erfolgte **kein** Eingriff in diese Veröffentlichung.

## Ausstehende manuelle Gerätetests

- Im Google-Play-internen Test als Tester registriertes Konto muss auf dem Android-Gerät 0.7.5 installieren.
- Google-Login, Firebase-Backup und Biometrie unter Play-Signatur testen.
- SQLCipher `.db`-Import mit altem Password-Safe-Master-Passwort **lokal** prüfen, insbesondere echte Kategorien/Bilder/TOTP-Daten.
- Verschlüsseltes Parola-Backup, XLSX/CSV-Export, Wiederherstellung, Archiv, Papierkorb und Sperrfunktionen prüfen.
- **Selbstzerstörungsmodus nur mit separaten Wegwerf-Testdaten prüfen** und nicht auf produktiven Tresoren aktivieren.
- Android-15-Randlosmodus-Warnung separat beheben / Gerätetest.
- Keine offene oder Produktionsfreigabe vor reproduzierbarer Datenmigrations-QA.

## Reproduzierbare, privat gehaltene Nachweise

- `tools/play-release/out/parola-play-upload-vc22.json`
- `tools/play-release/out/parola-internal-test-release-vc22.json`
- `tools/play-release/out/v075-build-sign-upload.log`

Diese Ausgaben enthalten keine Master-Passwörter und werden weiterhin nicht in Git eingecheckt.
