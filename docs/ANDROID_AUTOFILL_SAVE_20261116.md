# Parola – Android Passworterkennung (16.11.2026)

Repository: ShadowlessGT/PassManager
Base: main / f95293c / 0.7.8 (25)
Branch: feat/parola-android-autofill-save-20261116
Worktree: N:\Shadowless Studios\Apps\PassManager-Autofill-20261116

## Funktionsweise

1. Der Nutzer entsperrt Parola, öffnet Einstellungen und schaltet "Automatische Passworterkennung" ein. Die Einstellung ist anfangs AUS und liegt in nativen App-Einstellungen.
2. Parola öffnet den Android-Systemdialog, damit der Nutzer Parola selbst als Autofill-Dienst auswählt. Die Systemauswahl ist für die Aktivierung erforderlich.
3. Wenn eine fremde App ein von Android erkanntes Passwortfeld enthält, liefert der registrierte native AutofillService Android ein SaveInfo. Der Dienst stellt bewusst NOCH KEINE Passwörter zum automatischen Ausfüllen bereit.
4. Android kann nach erfolgreichem Login seinen offiziellen Speicher-Dialog anbieten. Nur nach der Zustimmung ruft Android onSaveRequest auf.
5. Der native Dienst liest die endgültigen AutofillValue-Feldwerte. Er speichert maximal 20 Funde für höchstens 7 Tage mit AES-256-GCM und einem eigenen AndroidKeyStore-Schlüssel ausschließlich im privaten App-Speicher. Keine Cloud-Uploads, keine Klartextdateien oder Log-Ausgaben.
6. Nach Parola-Entsperrung erscheinen die Funde im Tresor und in Einstellungen. Ein Fund wird erst nach erneuter Android-Geräteauthentifizierung in den Parola-UI-Speicherbereich entschlüsselt.
7. Der Nutzer prüft den Ursprung (Android-App-Paket, unbestätigte WebDomain), bestätigt neue Einträge oder wählt explizit ein anhand des Benutzernamens vorgeschlagenes bestehendes Konto zum Aktualisieren. Website-Adressen werden nie aus unbestätigten WebDomains automatisch übernommen.
8. Erst nachdem die übliche verschlüsselte Parola-Tresorspeicherung abgeschlossen wurde, wird der verschlüsselte Zwischeneintrag entfernt. Das bestehende Passwort-Verlaufsverhalten und Lizenz-Gates bleiben erhalten.
9. Deaktivieren leert den gesamten Zwischenspeicher; es werden keine künftigen Logins erfasst.

## Grenzen

- Das Erfassen wird durch Android, das unterstützte Formular und die Benutzer-Zustimmung bestimmt. Kein Passwortmanager kann sämtliche selbst eingegebenen Passwörter systemweit heimlich auslesen.
- Noch kein automatisches Ausfüllen vorhandener Passwörter in Drittanbieter-Apps. Die Funktion ist aktuell **Save-only**; sie darf nicht fälschlich als vollständiger Autofill-Provider beworben werden.
- Nach dem Android-Speichern ist eine separate Parola-Tresor-Bestätigung erforderlich; es gibt bewusst kein automatisches Überschreiben anhand möglicherweise gefälschter WebDomains.
- Der native gerätegebundene temporäre Schlüssel unterscheidet sich vom Parola-Master-Key. Captures werden nur über den bestätigten Tresor-Import in die Parola-Verschlüsselung übernommen.
- Die offizielle Android-Speicher-UI wird nicht von allen Drittanbieter-Apps unterstützt. Mehrstufige Anmeldungen liefern eventuell keinen Benutzernamen mit.
- Native Capture-Inbox wird im privaten App-Speicher gesichert, aber ist kein externes Backup; bei Deinstallation gehen ungespeicherte Captures verloren.

## Implementierte Dateien

- android/.../ParolaAutofillCaptureService.java
- android/.../ParolaAutofillCaptureStore.java
- android/.../ParolaAutofillPlugin.java
- android/app/src/main/res/xml/parola_autofill.xml
- Manifest und MainActivity-Registrierung
- src/androidAutofill.ts
- src/AutofillCapturePanel.tsx
- src/autofillSuggestions.ts und Unit-Tests
- src/autofillCapture.css, App- und Start-CSS-Einbindung

## Prüfungen

- 97 Vitest-Tests bestanden (26 Testdateien, 3 neue Tests).
- TypeScript und Vite erfolgreich.
- npx cap sync android erfolgreich, nur im isolierten Worktree.
- Android :app:compileDebugJavaWithJavac erfolgreich.
- Android :app:assembleDebug erfolgreich.
- ADB Geräte: keine Geräte verbunden, daher KEIN realer Android-Login-Test.
- Android APK: android/app/build/outputs/apk/debug/app-debug.apk. Dieselbe Package-ID wie Produktion: NICHT über die produktive App installieren, sondern nur Emulator oder Testgerät mit Dummy-Vault.
- Keine Veröffentlichung, kein Merge nach main, keine Play-Console-Änderung.

## Vor einer Freigabe testen

- Android Autofill-Systemdialog aktivieren/abbrechen, Statusanzeige prüfen, entgegengesetzten Default-Passwortmanager nicht automatisch überschreiben.
- Chrome Webformular, Firefox, Samsung Internet, native App auf Emulator/Android 16 testen; Fälle Anmeldung, Registrierung, Passwortwechsel.
- Sicherstellen, dass Parolas eigenes Masterpasswort nie angeboten oder gespeichert wird, OTP/PIN nicht fälschlich als Passwort behandelt wird.
- System-Speicherdialog ablehnen => keine Captures; bestätigen => verschlüsselte Inbox; Gerätesperre abbrechen => kein Klartext.
- Unbekannte Domain / Phishing-Website => niemals stilles Überschreiben; Änderungen nur nach expliziter Kontoauswahl.
- App sperren, Bildschirm aus, Deinstallation, native KeyStore-Fehler, Mehrfachfunde und 7-Tage-Ablauf prüfen.
- Free- und Premium-Konten mit vorhandenen Feature-Limits testen.

## Integration nach parallelem Main-Update

- Branch enthält zusätzlich Merge a99f6b6 von origin/main 3bc11c5 (Parola 0.7.9, versionCode 26, automatische Geräteentsperrung und neue Eintragssymbole).
- Erneut geprüft: 104 Vitest-Tests bestanden (28 Testdateien), TypeScript/Vite erfolgreich, Android Debug-APK gebaut (Gradle BUILD SUCCESSFUL).
- Play-Store-Upload, OTA-Release und Production-Merge bleiben weiterhin gesperrt, bis der Android-Autofill-Save-Flow auf einem Testgerät nachgewiesen ist.
