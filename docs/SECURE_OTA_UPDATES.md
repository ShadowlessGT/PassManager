# Parola: sichere Web-Updates ohne neuen Play-Store-Upload

Stand: 09.11.2026 — **Implementiert auf Entwicklungsbranch, NICHT produktiv freigegeben.**

## Architektur

- Die vollständige, offline nutzbare React-/Capacitor-App bleibt Bestandteil der Android-AAB.
- Version 0.7.2 / Android versionCode **19** führt erstmals die native Updater-Funktion ein.
- Etwa 7 Sekunden **nach** dem ersten UI-Rendering fragt die App im Hintergrund eine feste Firebase-Hosting-Adresse ab. Bei Wiederaufnahme wird frühestens nach 30 Minuten erneut geprüft. Offline oder bei Netzwerkfehlern wird kein Zugriff auf den Tresor blockiert.
- Die Datei `https://password-manager-parola.web.app/ota/android/stable.json` enthält eine Release-Version, Kompatibilitätsbereich der Android-VersionCodes, Notizen, ZIP-URL, genaue Downloadgröße, SHA-256 und **ECDSA-P-256-Signatur**.
- Die App akzeptiert nur mit einem im ursprünglichen AAB hinterlegten öffentlichen Schlüssel verifizierte Metadaten und ZIP-URLs auf der festgelegten Domain. Der native Updater überprüft zusätzlich die SHA-256-Prüfsumme des heruntergeladenen ZIPs vor Entpacken/Aktivieren.
- Nutzer sehen eine nicht blockierende Update-Einladung mit Downloadgröße und können **„Jetzt aktualisieren“** oder **„Später“** wählen. Keine automatische Installation, keine laufende Änderung an Code zur Laufzeit ohne Zustimmung.
- Beim Wechsel der Web-Dateien startet die WebView neu, und der **im Arbeitsspeicher gehaltene Tresor-Schlüssel geht verloren**; erneutes Entsperren ist erforderlich.
- `notifyAppReady` meldet dem nativen Updater nach UI-Rendering einen funktionierenden Start. Die Capgo-AppReady-Überwachung kann bei einem nicht startfähigen Web-Bundle auf das vorherige funktionierende Bundle zurückschalten. Trotzdem sind **echte Testgeräte, funktionierende Rücksicherung und verschlüsselte Backups erforderlich**.
- **Native Änderungen** (Android SDK, Berechtigungen, Capacitor-Plugins, native Sicherheit, Google Play Billing) benötigen weiterhin eine neue Google-Play-AAB. OTA ersetzt keine regulären Store-Updates.

## Sicherheit / Release-Schranken

1. Der **private** ECDSA-P-256-OTA-Schlüssel liegt lokal außerhalb des Git-Repositories: `%USERPROFILE%\Documents\Parola-OTA-Signing\parola-ota-ecdsa-p256-private.pem`. Das Verzeichnis ist auf Windows-Benutzer und SYSTEM berechtigt. **Weder private Schlüssel, Entschlüsselungsschlüssel, Masterpasswörter noch Firebase-Admin-Schlüssel dürfen in ZIPs, Git, AAB oder Firebase Hosting gelangen.** Den OTA-Schlüssel verschlüsselt offline sichern. Verlust des Schlüssels erfordert neues AAB mit neuer Vertrauenskette.
2. Der öffentliche Schlüssel ist in `src/otaPublicKey.ts` fest eingebaut; eine geänderte Signatur kann vom Server allein nicht vorgetäuscht werden. Wer Zugriff auf den privaten Schlüssel hat, könnte jedoch beliebigen App-JavaScript-Code freigeben. Er muss wie ein produktionskritischer Signaturschlüssel geschützt werden.
3. Der Release-Generator `scripts/ota-release.mjs` akzeptiert nur eine **höhere** semantische Web-Version, passende native versionCodes und eine funktionsfähige Build-Konfiguration. Er veröffentlich selbst **nichts**. Der aktuelle Default-Kompatibilitätsbereich ist exakt `19..19`.
4. Die API der Download-Bundles liegt auf Firebase Hosting, getrennt von den verschlüsselten Nutzerinhalten. Ein Web-Update darf bestehende IndexedDB- und Secure-Storage-Schemata nicht inkompatibel ändern. Alle Vault-/Backup-Migrationen separat und rückwärtskompatibel testen.
5. `npm audit` meldet aktuell noch Paketwarnungen; vor öffentlichem Release beheben/prüfen. Ein externes Security-Review ist für einen Passwortmanager sinnvoll.
6. Keine GitHub Actions; lokale Builds, Tests, Signierung und manuelle Freigabe.

## Einmalige Android-Einführung

Im Projektverzeichnis:

```powershell
npm ci
npm run build
npm test
npx cap sync android
# Danach mit Android Studio/JDK21 Android bauen
# Release-AAB mit vorhandenem Upload-Keystore signieren
```

Neue `0.7.2` (versionCode 19) **zuerst im internen Google-Play-Test** verteilen. Native OTA-Funktion auf echtem Gerät prüfen, einschließlich Original-Tresor-Sicherung, Offline-Start, Update-Dialog und Rückfall. Vorher **kein** OTA-Manifest veröffentlichen.

## Ein späteres Web-Update vorbereiten

1. Web-Code verändern. Vor jeder Freigabe `npm test`, `npm run build`, Android-Dummy-Tresor mit Backup/Restore testen. Firebase-Konfiguration aus der sicheren `.env.local` verwenden.
2. Eine **höhere** Web-Version signieren, beispielsweise `0.7.3` (native Code 19 bleibt):

```powershell
npm run ota:bundle -- --version 0.7.3 --notes "Verbesserungen an der Oberfläche" --min-native-code 19 --max-native-code 19
```

3. Prüfen: `ota-staging/ota/android/stable.json` und `ota-staging/ota/android/bundles/*.zip` enthalten **keine Geheimnisse**. Die Dateien liegen im getrennten Verzeichnis `ota-staging/ota/android/` und sind bewusst von Git und vom Firebase-Hosting-Deployment ausgeschlossen.
4. Die Firebase-Hosting-Konfiguration zunächst mit `firebase hosting:sites:list --project password-manager-parola` und `firebase hosting:channel:deploy ...` auf einer sicheren Preview testen; keine bestehenden Websites überschreiben. Das definierte Hosting-Ziel ist `password-manager-parola.web.app`.
5. Nach Android-E2E-Freigabe explizit `npm run ota:stage -- --version 0.7.3 --approve-tested-android-update` ausführen. Das prüft Signatur und Prüfsumme erneut und kopiert nur den freigegebenen Kandidaten ins Hosting-Verzeichnis, veröffentlicht ihn aber noch nicht. Der Firebase-Hosting-Predeploy-Guard verhindert eine versehentliche Veröffentlichung ohne zusätzliche Versionsfreigabe. PowerShell-Beispiel: `$env:PAROLA_OTA_DEPLOY_APPROVED="0.7.3"; firebase deploy --only hosting --project password-manager-parola; Remove-Item Env:PAROLA_OTA_DEPLOY_APPROVED`. Bei diesem Deploy sollte vorher geprüft werden, ob das Verzeichnis alle benötigten früheren Releases enthält, da Hosting einen Snapshot veröffentlicht. Frühere noch kompatible Bundles nicht versehentlich aus der Verteilung entfernen.

## Sperre / Rollback

- Neues Update wird nur auf ausdrücklichen Nutzerklick installiert.
- Ungültige Metadaten/Signaturen/Hashes, Netzwerkfehler, inkompatible native Versionen und Offline-Zustand verhindern das OTA ohne Datenverlust.
- Der native Watchdog versucht bei fehlendem `notifyAppReady` den Rückfall.
- Falls ein Update zwar startet, aber fachlich fehlerhaft ist: Notfallkorrektur nur mit **höherer** signierter Web-Version; im Zweifel neues signiertes AAB über Google Play. Das veröffentlichte `stable.json` kann vom Hosting entfernt werden, wodurch keine neuen Installationen des defekten OTA starten. Ein bereits installiertes Bundle wird dadurch nicht automatisch entfernt.

## Aktueller Status

Client, Android-Debug-Build, Signaturprüfung und Unit-Tests sind implementiert. Der Firebase-Hosting-Endpunkt ist eingerichtet, enthält aber bewusst kein aktives OTA-Manifest. Ein signiertes Paket 0.7.3 wurde nur als lokaler, nicht freigegebener Test erzeugt. **Noch ausstehend:** vollständiger Android-Build/Tests auf einem echten Gerät, Hosting-Preview inkl. echter signierter ZIPs, fachliche Rollback-Tests, Paket-Sicherheitsprüfung, interne Play-Testversion 0.7.2 (versionCode 19) und aktive Firebase-Hosting-Distribution. **Kein Produktions-Rollout erfolgt.**
