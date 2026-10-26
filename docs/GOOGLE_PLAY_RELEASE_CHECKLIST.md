# Google Play Release-Checkliste - Passwort Manager: Parola

Stand: 26.10.2026. Status: TECHNISCHER TESTSTAND, nicht produktionsreif.

## Bereits geprüft
- Android-App-ID: `com.shadowlessstudios.passwordmanager`, Target API 36.
- Verschlüsselte lokale Tresordaten, optionale Firestore-Sicherung (Cloud-Tests auf realem Gerät noch offen).
- Firestore-Regeln nach 15 lokalen Emulator-Sicherheitsprüfungen bereitgestellt.
- Android-Systembackup und Geräteübertragung der Tresordaten ausgeschlossen (Manifest und API-31-Datenextraktionsregeln).
- Builds und Tests ausschließlich lokal; keine GitHub Actions.

## Blocker vor öffentlicher Google-Play-Veröffentlichung
1. **Datenschutz:** Rechtlich vollständige Datenschutzerklärung inklusive verantwortlicher Stelle, Kontaktadresse, Verarbeitungszwecken, Drittanbietern und Löschfristen veröffentlichen; aktuelle `public/privacy.html` ist ausdrücklich Entwurf.
2. **Kontolöschung:** Löschung eines in der App erstellten Firebase-Kontos **innerhalb der App** und über einen öffentlichen Webpfad ermöglichen; dabei Vault, Entitlements und erforderliche Serverdaten konsistent entfernen. Mit Firebase Auth/Firestore/Functions end-to-end testen.
3. **Premium:** Free-Beschränkungen bei benutzerdefinierten Feldern, Bildern, OCR und erweiterten Eingaben in tatsächlicher Speicherung und UI implementieren; bestehende Free-Nutzer dürfen nie den Zugriff auf ihre bereits gespeicherten Daten verlieren.
4. **In-App-Kauf:** Nicht-verbrauchbares Google-Play-Billing-Produkt einrichten; serverseitige Kaufprüfung, Erteilung, Wiederherstellung und Widerruf der Freischaltung umsetzen; keine Kaufberechtigung allein anhand von Client-Feldern.
5. **Cloud Functions:** Cloud Functions API ist im Projekt `password-manager-parola` derzeit deaktiviert (403); eventuelle Blaze-Kosten, Secret `PASSMANAGER_REDEMPTION_HMAC_KEY`, Admin-Claims und App Check korrekt konfigurieren und testen. Funktionen nicht als live bewerben.
6. **Firebase App Check:** Vor Enforcement erst WebView-/Android-Attestierung real testen. Ungeprüftes Enforcement kann legitime Zugriffe auf Firebase blockieren.
7. **App-Bundle und Signatur:** Release-AAB mit gesichertem Upload-Keystore erstellen, Google Play App Signing einrichten. Debug-APK darf nicht hochgeladen werden.
8. **Store-Setup:** App in Play Console anlegen, Store-Eintrag, lokalisierte Texte, 512px Icon, Feature Graphic, reale Screenshots, Supportkontakt, Data-Safety-Fragen, Inhaltsfreigaben und passende Testtracks prüfen.
9. **Sicherheit und QA:** Manuelle Tests auf echten Android-Geräten inklusive Backup/Restore, Masterpasswort-Verlust, Biometrie, Bildschirmaufnahmen, Android 16 Edge-to-Edge, wechselnde Schriftgrößen, Import/OCR und Offline-Konflikten. Externes Security-Review vor breiter Freigabe empfohlen.

## Lokale Prüfungen
- `npm run build`
- `npm test`
- `npm run test:rules` (benötigt Android-Studio-JDK 21 und freien Port 8189)
- `npx cap sync android`
- `android/gradlew.bat :app:assembleDebug` bzw. `:app:bundleRelease` zur Build-Prüfung; ein unsigniertes AAB ist **kein** Upload-Artefakt.

## Hinweise
- Android-Backup-Ausschluss bedeutet: Nutzer brauchen exportierte verschlüsselte Sicherung oder getestete Cloud-Wiederherstellung vor Neuinstallation.
- Firestore speichert begrenzte Dokumentgrößen. Große Bildanhänge dürfen Cloud-Backups nicht stillschweigend beschädigen; Limits und Fehlermeldungen testen.
- Keine Firebase-Ressourcen oder Google-Play-Produkte mit möglicherweise laufenden Kosten ohne Prüfung des Tarifs aktivieren.
- Google Play veröffentlicht die App erst nach vollständiger Compliance-Prüfung und expliziter Release-Freigabe.
