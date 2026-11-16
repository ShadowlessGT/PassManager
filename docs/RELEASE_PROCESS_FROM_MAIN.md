# Parola – zentraler Main- und Release-Prozess

## Prinzip

`main` im GitHub-Repository `ShadowlessGT/PassManager` ist der gemeinsame, getestete Quellstand für Android, Web/Ota und Browser-Erweiterungen. Neue Funktionen werden in isolierten Branches oder Worktrees implementiert. Jede Änderung muss erst gegen den aktuellen `origin/main` integriert und getestet werden; der Produktionszustand darf nicht von veralteten Feature-Branches erzeugt werden.

## Android Google Play

1. Nach einem erfolgreichen Merge in `main` wird ein neuer `versionCode` (> zuletzt bei Play vorhanden) mit konsistenten `versionName`, `package.json` und `package-lock.json` reserviert.
2. `npm test`, `npm --prefix functions test`, `npm run test:extension`, `npm run build` aus exakt diesem Quellstand ausführen.
3. Native Plugins mit `npx cap sync android` integrieren, `android/gradlew.bat :app:bundleRelease` bauen. Generierte Capacitor-Gradle-Dateien nicht blind als Source-Änderungen committen.
4. Mit `tools/play-release/Sign-Parola-AAB.ps1` über den bestehenden, lokal DPAPI-gesicherten Uploadschlüssel signieren und Zertifikat kontrollieren. Keine Schlüssel im Git-Repo.
5. `tools/play-release/Upload-Parola-Play.py --check` prüfen; dann `--upload` lädt das signierte AAB ohne Track-Zuweisung hoch.
6. `tools/play-release/Release-Parola-Internal-Test.py --check` und `--publish` stellen genau den hochgeladenen Build nur dem internen Test bereit. Unabhängiger API-Readback muss das bestätigen.
7. Produktions- und offene Test-Tracks bleiben bis zu eigenständiger QA-Freigabe unberührt, insbesondere bei Google-Play-Kauf, biometrischem Tresor, Datenmigration und Android Autofill.

## Parola 0.7.12 / VC29

- Zusammenführung der aktuellen Android-Hauptentwicklung mit dem getesteten Raster-/Sortier-/Kompakt-UI-Branch.
- App 123/123, Backend 13/13, Browser 20/20 Tests erfolgreich; TypeScript/Vite und Android Release AAB erfolgreich.
- SHA256 des signierten AAB: `cdead274b290cb02f7f0deb30ceadb1ee8fc0dba6fed8a9dcbecf24b5107a83e`.
- Google-Play-Upload bestätigt: `PAROLA_AAB_UPLOAD_SUCCESS=TRUE`.
- Interner Track bestätigt VersionCode **29**: `INTERNAL_TEST_RELEASE_CONFIRMED=TRUE`.
- Offener Test weiterhin VC20 und Produktion weiterhin VC24; beide vom Release-Skript als unverändert geprüft.
- Der lokale alte UI-Zwischenstand vor dem Merge ist als beschriftetes `git stash` und `M:\AI\parola-main-ui-draft-preserved-20261116.patch` gesichert.
- Der ungeprüfte Chrome-/Firefox-Google-Auth-Prototyp ist nicht gemergt. Vor Store-/Hostinger-Veröffentlichung echte Browser-E2E-/Sicherheitsprüfung und Callback-Allowlist erforderlich.

## Web und Browser – getrennte Ziele

- Reine App-Web/OTA-Updates nur für Web-Ressourcen, niemals für neue Android-Java-Dienste oder Manifest-Berechtigungen verwenden; vor Veröffentlichen den App-spezifischen OTA-Signatur-/Versions- und Hostinger-Prozess prüfen.
- Browser-Erweiterungen aus aktuellem `main` mit `npm run test:extension` und `npm run extension:build` paketieren. Die Pakete sind erst nach Store-Tests, korrekt eingerichtetem OAuth-Flow und Sicherheitsreview freizugeben.
- Firebase-Backend separat mit `functions` Tests/Rules prüfen; Deployment und App-Check-Enforcement nicht implizit durch einen Android-Build auslösen.

**Freigabesperren:** 0.7.12 ist zunächst ein interner Android-Test. Reale Android-Autofill-Save-Tests, vollständige Play-Testkauf/Wiederherstellungsfälle und mobile Layout-Prüfung sind vor einem öffentlichen Release weiter erforderlich.
