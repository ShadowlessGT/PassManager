# Parola 0.7.11 (VC 28) – Android-Passworterkennung: Integrations- und Testrelease

Stand: 16.11.2026

## Quelle und Änderungsumfang

- Base: \`origin/main\` bei \`fd130d2\` (Parola 0.7.10 / VC 27, Ultra und Geschenkcodes)
- Autofill-Zweig: \`feat/parola-android-autofill-save-20261116\` (Save-only native Android AutofillService)
- Release-/Integrationszweig: \`release/parola-v0711-autofill-integration\`
- Neu: Parola 0.7.11 / VersionCode 28. Unveränderliches Google-Play-Bundle VC27 wird **nicht** überschrieben.
- Play Ultra, bestehende kostenlose Geschenkcodes, Import, Passworttresor und Biometrie bleiben aus 0.7.10 erhalten.

## Funktionsumfang

1. Einstellung "Automatische Passworterkennung" ist aus Sicherheitsgründen **standardmäßig deaktiviert**.
2. Nach Aktivierung und expliziter Android-Systemfreigabe als Autofill-Dienst kann Android nach unterstützten Login-Formularen den nativen Passwort-Speicherdialog anbieten.
3. Nur nach Android-Speicherfreigabe wird ein erfasster Login bis zu sieben Tage gerätegebunden mit AES-GCM (Android Keystore) vorgemerkt, maximal zwanzig Funde. Keine Synchronisierung des temporären Klartextes.
4. Die Funde werden im entsperrten Parola-Tresor angezeigt. Vor Einsehen/Übernehmen verlangt die native Plugin-Brücke eine erneute gesicherte Android-Geräteauthentifizierung.
5. Explizite Nutzeraktion: neuen Eintrag anlegen oder ein vorhandenes, anhand des Benutzernamens vorgeschlagenes Konto aktualisieren. Die gemeldete Webdomain gilt NICHT als verifizierte Quelle und führt nie alleine zum automatischen Überschreiben.
6. Erst nach erfolgtem verschlüsselten Tresor-Schreibvorgang wird der temporäre Fund gelöscht. Abschalten löscht alle vorgemerkten Funde.
7. Der eigene Parola-Paketname ist vom Android-Dienst ausgeschlossen (Masterpasswort wird nicht erfasst). OTP/Kartenfelder werden nach Feldhinweisen ausgeschlossen.
8. **Nicht enthalten**: Automatisches Ausfüllen gespeicherter Passwörter in anderen Android-Apps. Das ist ein eigenständiger, noch zu prüfender Funktionsblock.

## Prüfstatus vor dem Play-Upload

- App: \`npm test\` – 104 Tests bestanden, 28 Dateien.
- Backend: \`npm --prefix functions test\` – 13 Tests bestanden.
- \`npm run build\` – TypeScript/Vite erfolgreich.
- \`npx cap sync android\` – erfolgreich.
- \`:app:bundleRelease\` – AAB erstellt.
- Signatur: bisheriger Parola-Uploadschlüssel durch \`Sign-Parola-AAB.ps1\` verifiziert.
- Signed AAB: \`tools/play-release/out/Parola-v0.7.11-vc28-SIGNED.aab\`
- SHA256: \`8cda6a70f82771815dc3aa423acc18dbfe8be93ffabf30ec8c1775144d58c649\`
- Play-API-Preflight: höchster bekannter VC27; VC28 darf hochgeladen werden.

## Release-Grenzen

- **Internen Test** als nächsten Schritt nutzen. Kein Produktionsupdate ohne erfolgreichen realen Android-Autofill-Speichertest.
- Realen Gerätetest durchführen: Autofill ein/aus, Dienst auswählen, Formular in Chrome/Samsung Internet und einer nativen Test-App, Android-Speicherprompt, Parola-Entsperrung, sicherer Import, Deaktivierung und Ablauf nach 7 Tagen.
- Testkauf/Google-Play-Lizenz testerabhängig: aktueller Admin-/Geschenkcode-Erfolg ist kein Nachweis eines erfolgreichen Google-Play-Testkaufs.
- AppCheck-Enforcement für alte Cloud Functions ist noch nicht durchgängig aktiviert; App-Build-Flag \`VITE_APPCHECK_ENABLED=false\` entspricht dem aktuell internen 0.7.10-Build.
- Keine automatische Freigabe in Open Testing oder Produktion. Keine OTA-Aktualisierung der AutofillService möglich: nativer Android-Build erforderlich.

## Google Play Uploadversuch

- 16.11.2026: Erster Upload und anschließende Statusprüfung erhielten Google Play Developer API HTTP 503 (UNAVAILABLE). Es liegt noch keine bestätigte Bundle-28-Annahme vor. Kein Track wurde verändert.

## 16.11.2026: Google Play interner Test veröffentlicht

- Signed AAB 0.7.11 / VC28 wurde hochgeladen; Google Play Readback bestätigt die Annahme.
- Internal Track: VC28, verifiziert durch INTERNAL_TEST_RELEASE_CONFIRMED=TRUE.
- Open Testing bleibt VC20, Production bleibt VC24.
- Erstmaliger HTTP 503 Uploadfehler wurde durch erneuten erfolgreichen Upload behoben.
- Native Save-only Android Autofill Funktion ist im Build. Ein echter Android-Gerätetest ist vor öffentlicher Veröffentlichung weiterhin erforderlich.
