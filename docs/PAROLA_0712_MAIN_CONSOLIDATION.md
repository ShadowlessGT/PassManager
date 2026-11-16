# Parola 0.7.12 / VC29 – konsolidierter Main-Stand

Datum: 16.11.2026

## Basis und Merge

- Ausgangspunkt: `origin/main` (`cb3d10e`, Parola 0.7.11, VC28).
- Merge der abgeschlossenen, geprüften Funktionalität aus `feat/parola-compact-vault-grid-sort-20261116` (branch head `bf05b07`).
- Integration: `release/parola-v0712-integrated`, Merge-Commit `099305f`.
- Alle bereits in Main enthaltenen Funktionalitäten bleiben bestehen: Android-Autofill **Save-only**, Ultra/Billing und Geschenkcodes, biometrisches Entsperren, Sicherheitscenter, Import/Export (inkl. SQLCipher Password Safe), Kategorien direkt beim Eintrag, Bilder oben im Editor und Eintragssymbole.
- Neu: einstellbares Kategorienraster mit 1/2/3 Spalten oder Liste, benutzerspezifische Sortieransichten und kompakte Tresorstartseite mit sichtbarer Suche und rasch erreichbaren Einträgen.
- `feat/parola-browser-shared-google-login` ist ausdrücklich **nicht produktionsreif** und nicht übernommen. Es handelt sich um einen Prototypen ohne abgeschlossene Auth-/Browser-/Hostinger-E2E-Sicherheitsprüfung. Die bisherigen Browser-Erweiterungen werden nicht absichtlich durch diesen Prototyp ersetzt.
- Lokaler Hauptordner `N:\Shadowless Studios\Apps\PassManager` hatte drei nicht committete ältere UI-Zwischenentwürfe. Diese werden vor dem Fast-Forward als benanntes `git stash` plus Patch-Kopie gesichert; sie sind funktional durch den fertigen Raster-Zweig überholt und werden nicht blind überschrieben.

## Prüfungen

- `npm test`: 123/123 bestanden, 31 Testdateien.
- `npm --prefix functions test`: 13/13 bestanden.
- `npm run test:extension`: 20/20 bestanden.
- `npm run build`: TypeScript und Vite erfolgreich.
- `npx cap sync android`: erfolgreich.
- `gradlew.bat :app:bundleRelease --offline --no-daemon --console=plain`: erfolgreich (`BUILD SUCCESSFUL`).
- Android-AAB wurde mit vorhandener DPAPI-Signatur (Alias `parola`) signiert und mit dem bisherigen Google-Play-Upload-Zertifikat abgeglichen.
- Signiertes Bundle: `tools/play-release/out/Parola-v0.7.12-vc29-SIGNED.aab`
- SHA256: `cdead274b290cb02f7f0deb30ceadb1ee8fc0dba6fed8a9dcbecf24b5107a83e`.
- Eine echte native Android-Laufzeitprüfung der neuen Save-only-Autofill-Erkennung und eine vollständige Google-Play-Testkaufabwicklung stehen weiterhin aus.

## Releasepolitik

- `main` ist der **einzige gemeinsame geprüfte Quellstand**; Builds und Deployments werden durch lokale signierte Buildskripte oder ausdrücklich freigegebene CI aus genau diesem Stand erzeugt.
- Jeder neue Android-Upload braucht einen höheren `versionCode`; für diese Integration: 29.
- Testfreigabe erfolgt zuerst ausschließlich auf `internal`. Kein automatisches Promotion nach `beta` oder `production`, bis reale Geräte-/Kauf-/Speicher-Tests bestanden sind.
- Google-Play-Upload und Zuweisung zu `internal` werden protokolliert und unabhängig über Play Developer API rückgelesen.
- Browser-Extension-Veröffentlichung und Webseiten-/OTA-Deployment sind getrennte Artefakte mit separater Sicherheitsabnahme; ein Android-Deploy aktiviert sie nicht automatisch.
- Android-Manifest/Java Änderungen erfordern ein natives APK/AAB und können nicht durch ein reines Web-OTA ausgeliefert werden.

## Offene Punkte

- Reale Android-UI-Prüfung für 1/2/3-Spalten-Raster, kleines Display, extrem lange Kategorienamen, Sortierung und geänderte Startseite.
- Android-Autofill Save-only: Speicherdialog, gesicherte Übernahme, Geräteauthentifizierung, Abbruchfall und Browserkompatibilität.
- Android Google-Play-Lizenztestkauf mit Testzahlung, Kaufwiederherstellung, Abbruch/Pending und Erstattung.
- Browser Google-Login-Prototyp separat härten und E2E prüfen, dann kontrolliert integrieren.
