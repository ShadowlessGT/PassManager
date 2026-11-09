# Parola: sichere signierte Web-Updates via bestehende Hostinger-Webseite

Stand: 09.11.2026. Implementiert auf `feat/parola-secure-ota-updates`, **nicht produktiv freigegeben**.

## Architektur

- Bestehende Parola-Website: https://parola.shadowless-studios.eu/ (Hostinger). **Keine separate Firebase Hosting-Verteilung erforderlich**.
- Fest im Android-Client hinterlegter Update-Endpunkt: https://parola.shadowless-studios.eu/ota/android/stable.json
- Unveränderliche ZIP-Dateien: https://parola.shadowless-studios.eu/ota/android/bundles/parola-web-VERSION-HASH.zip
- Android 0.7.2/versionCode 19 enthält erstmalig den nativen Capgo-Updater. Das Android-AAB enthält alle Offline-Dateien.
- Die App prüft etwa 7 Sekunden nach dem Start und bei Rückkehr aus dem Hintergrund frühestens nach 30 Minuten.
- Jedes Manifest enthält Versionsbereich für Android, SHA-256, exakte Paketgröße, Änderungsnotizen und eine **ECDSA-P-256-Signatur**. Nur der im AAB verankerte öffentliche Schlüssel verifiziert die Signatur. Die App akzeptiert **nur ZIP-URLs vom festen Hostinger-Origin**. Der native Updater prüft außerdem SHA-256.
- **Nutzer müssen auf „Jetzt aktualisieren“ tippen**. Offline-Zugriff auf den verschlüsselten Tresor bleibt erhalten. Beim WebView-Neustart wird der RAM-Tresorschlüssel verworfen; erneutes Entsperren ist notwendig.
- Der native AppReady-Watchdog kann nicht startfähige Bundles zurückrollen. Fachliche Fehler und Datenmigrationen benötigen eigene Tests/Notfallplan.
- **Native Änderungen** (Android-Code, Berechtigungen, Capacitor-Plugins, Billing) benötigen weiter ein neues Google-Play-AAB.
- Firebase **Auth/Firestore/Backup** werden nicht geändert; nur die Verteilung der UI-Updates nutzt Hostinger.

## Sicherheit

Der **private** Signaturschlüssel liegt ausschließlich lokal außerhalb von Git:
`%USERPROFILE%\Documents\Parola-OTA-Signing\parola-ota-ecdsa-p256-private.pem`.
**Niemals** Schlüssel, Passwörter, Firebase-Admin-Credentials, Masterpasswörter oder Tresorinhalte nach Hostinger/GitHub hochladen. Der öffentliche Schlüssel liegt in `src/otaPublicKey.ts`; gestohlener Privatschlüssel wäre kritisch. Den privaten Schlüssel verschlüsselt offline sichern.

`src/otaManifest.ts` pinnt die Hostinger-Domain. Ein Angreifer mit Webserver-Zugriff kann ein gültiges Update ohne den privaten Signaturschlüssel nicht fälschen. Der Server muss HTTPS, CORS und Cache-Verhalten korrekt ausliefern. Die dedizierte `ota/android/.htaccess` setzt CORS für `stable.json`, verhindert Manifest-Caching und cached unveränderliche ZIP-Dateien. **CORS im echten Android-WebView noch nachweisen**.

## Rollout

1. Code/Test auf einem Gerät mit Dummy-Tresor prüfen. App-Version 0.7.2 / versionCode 19 zuerst intern über Google Play verteilen; noch **keine** Live-OTA-Datei veröffentlichen.
2. Für ein Web-Release aus dem Repo: `npm test`, `npm run ota:bundle -- --version 0.7.3 --notes "UI Verbesserungen" --min-native-code 19 --max-native-code 19`. Aus `dist/` wird ein vollständiges signiertes Bundle in **`ota-staging/ota/android/`** erstellt. Dieses Skript veröffentlicht nichts.
3. Mit `npm run ota:verify` verifizieren. Erst nach Android-QA: `npm run ota:stage -- --version 0.7.3 --approve-tested-android-update`. Das kopiert signierte Dateien nach `ota-public/ota/android/`, **ohne Upload**.
4. Der bestehende Hostinger-Website-Upload `DEPLOY_SITE.cmd` lädt nur `site-dist/` hoch. OTA hat einen **separaten Upload**. Eine lokale `deploy.local.env` braucht ein **nachweislich korrektes Parola-Document-Root**, Benutzer/Passwort, SFTP mit geprüftem SSH-Fingerprint oder FTPS mit gültigem TLS-Zertifikat. Keine Zugangsdaten in Git oder Chat.
5. **Read-only Probe**: `npm run ota:probe`. Vor Freigabe wird geprüft, ob im Remote-Ziel tatsächlich die Parola-Webseite liegt. Fehlt die lokale Konfiguration, meldet die Probe lediglich den ausstehenden Zugang; **kein** Upload.
6. Nach echten Android-Tests und gesicherten Tresordaten ausdrücklich `npm run ota:publish -- --version 0.7.3 --approve-tested-android-update` ausführen. Das Skript prüft die P-256-Signatur und ZIP-SHA-256 erneut, akzeptiert ausschließlich verschlüsselte Verbindung, schreibt nur unter `ota/android/`, verifiziert Remote-Bytes und veröffentlicht `stable.json` **zuletzt**. Keine Website-Datei und kein früheres Bundle werden gelöscht. Ein Downgrade des Live-Kanals ist gesperrt.
7. Öffentliche Verteilung mit HTTPS prüfen: `stable.json` mit `Cache-Control: no-store`, `Access-Control-Allow-Origin: *`, ZIP unter signierter Hostinger-URL und SHA-256 identisch. **Keine Freigabe**, solange diese HTTP-Prüfung und der Android-E2E-Test fehlen.

## Updates stoppen / Rollback

Manifest auf dem Hostinger-Server zurückziehen: Es werden keine neuen OTA-Installationen angeboten. Bereits installierte Bundles bleiben bestehen; im Notfall signierte **höhere** Web-Version oder neues Play-AAB. Der Capgo-AppReady-Watchdog ist kein Ersatz für Tests von Tresor-Migrationen und Backup/Restore.

## Aktueller Stand

Hostinger-Landingpage ist online (HTTP 200), `/ota/android/stable.json` ist derzeit **404**. Code für Hostinger-Verteilung wird vorbereitet und lokal getestet; **keine** OTA-Freigabe hochgeladen. Vorheriger Firebase-Hosting-Testendpunkt bleibt ungenutzt und ist aus dem Repository als OTA-Quelle entfernt. Keine Play-Store-Veröffentlichung durch diese Umstellung. Die bereits gebaute 0.7.2-Debug-APK mit Firebase-Update-URL muss ersetzt werden. Offene Prüfungen: Android-Gerät, ZIP-Download/HTTPS/CORS/Watchdog und `npm audit`.
