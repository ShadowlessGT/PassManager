# PAROLA 0.7.8 (versionCode 25) – nativer Password-Safe-Import

Status: **signiertes AAB bei Google Play hochgeladen und dem internen Test zugewiesen**, Produktion bleibt auf 0.7.7 (24). Kein automatischer öffentlicher Rollout vor einem erfolgreichen Android-Gerätetest.

## Belegtes Quellschema (nur Metadaten, keine Geheimnisse gespeichert)

Die vom Anwender bereitgestellte Original-`.db` wurde **ausschließlich innerhalb der lokalen Chat-Dateiumgebung** entschlüsselt und schreibgeschützt analysiert. Sie wurde **nicht** auf den Windows-PC, nach GitHub oder in Firebase übertragen; Passwort, Klartext-Inhalte und Originalbilder wurden nicht in Logs/Repository übernommen.

In der konkreten Originaldatei wurden lokal verifiziert: 324 Passworteinträge, 738 individuelle Werte, 24 Kategorien mit Farben, 89 Kategorie-Verknüpfungen, 93 JPEG-Originalbilder (gesamt ca. 18,34 MB), 399 historische Geheimwerte, 14 Quell-Icon-Zuordnungen. Exakte relationale Queries für Passwörter, Felder, Kategorien, Bilder, History und Farben erfolgreich ausgeführt, SQLite `quick_check=ok`. Keine fehlenden Bild- oder Feldeintrag-Verknüpfungen. Die 399 History-Werte umfassen Hauptpasswörter **und** die Historie anderer als geheim markierter Elemente. Historische Spezialwerte werden nicht als frühere Hauptpasswörter fehlklassifiziert.

## Umsetzung

- Native Dateiöffnung nur auf Android über Dateiauswahl und SQLCipher im privaten Gerätespeicher. Kein Quellpasswort speichern oder hochladen. SQLCipher 4 mit Legacy-2/3-Fallback; Quelldatei schreibgeschützt.
- **Relationaler Exporter:** `Passwords` als Haupttabelle; Join zu `PasswordEntryElement`/`PwEntryElementContent`, `Categories`/`PwCatRelations`, `CategoriesColors`, `Images`/`ImagesOrder`, `PasswordHistory`, `Favorites`, `Archive`.
- **Kein Bulk-Transfer der Fotos in der Vorschau:** Native verschlüsselte Sitzung erzeugt nur sichere Bildreferenzen; nach bestätigtem Import lädt die JS-Schicht jedes JPEG/PNG/WebP einzeln und in Originalqualität. Erst wenn alle angeforderten Bilder vollständig vorliegen, wird der neue Vault-Datensatz als Ganzes AES-GCM-verschlüsselt persistiert.
- Session: zufälliger Sitzungsschlüssel, nur im RAM, 30-Minuten-Ablauf, explizite Freigabe bei Ende/Abbruch, Schließen der SQLCipher-Datenbank und Löschen der **verschlüsselten** temporären Kopie.
- Max. 1500 Quell-Passwort-Einträge, 1000 Originalbilder, 55 MB gesamte Bildrohdaten und 5 MB je Bild. Das vorliegende Original liegt unter den Grenzen. Bei Datenverlustgefahr wird **abgebrochen**, nicht stillschweigend verkürzt.
- Kategorie-Farben aus der Quell-App werden für neu angelegte Kategorien übernommen, bestehende Parola-Kategorien nicht überschrieben.
- Historiespezifikation: frühere Hauptpasswörter bleiben in `passwordHistory` (bis 50). Historische Werte individueller Geheimfelder werden als separate verschlüsselte Zusatzfelder mit Datumslabel erhalten.
- Bildgalerie sowohl im Einfach- als auch Expertenmodus verfügbar; für PAROLA Free freigegeben; maximal 12 Bilder je Eintrag, bis 5 MB je Bild.
- Warnungen und bewusste Freigabe bei nicht automatisch konvertierbaren Quell-Icons, Anhängen, OTP-/Passkey-Daten. In der konkret geprüften Quelle waren **keine** Attachments, OTP- oder Passkey-Datensätze vorhanden; 14 Quell-Icon-Bezeichner benötigen eine bewusste Teilimport-Bestätigung.

## Validierungen

- 94 App-/Mapping-Tests bestanden, darunter synthetischer 324/93/399-Datensatz und Fehlersicherungen bei fehlenden Bildern/History.
- 20 Browser-Erweiterungstests bestanden.
- TypeScript-Web-Build, Firebase OAuth-Preflight, Capacitor-Sync, Gradle-Release-Bundle, DPAPI-Signierung und Google-Play-Upload erfolgreich.
- VersionCode 25 im Google-Play-**internen Test** freigegeben, bestehende Beta- und Production-Tracks unverändert.

## Vor der Produktionsfreigabe noch unbedingt auf einem echten Android-Gerät prüfen

1. Bestehende PAROLA-Daten als **verschlüsseltes** `.parola`-Backup sichern, Original-Password-Safe-`.db` behalten.
2. Mit einem getrennten Test-Tresor **0.7.8** aus dem internen Google-Play-Test installieren.
3. Password-Safe-`.db` lokal auswählen, Quell-Master-Passwort ausschließlich auf dem Gerät eingeben.
4. Vorschau: bis zu 324 Einträge, 93 Bilder, 24 Kategorien, 399 historische Werte, Hinweis zu 14 Quell-Icons. Bei vorhandenen Dubletten kann die tatsächliche Importzahl geringer sein.
5. Import durchführen und echte Originalbilder stichprobenartig prüfen (auch Einträge mit vier Bildern), weitere Geheimfelder, Kategorien/Farben und Passwort-Historien vergleichen.
6. Importierte Daten als verschlüsseltes `.parola`-Backup exportieren und **in einem separaten Test-Tresor** wiederherstellen.
7. **Cloud-Hinweis:** Die bisherige manuelle Firebase-Firestore-Sicherung speichert ein einzelnes verschlüsseltes Dokument mit der Firestore-Dokumentgrößenbegrenzung. Ein Tresor mit 18 MB Bildern kann dort nicht als einzelnes Dokument gesichert werden. Bis zu einer getrennten Chunk-/Object-Storage-Lösung die lokale verschlüsselte `.parola`-Sicherung benutzen. Der lokale verschlüsselte Tresor kann die Daten speichern.

**Keine Quellkennwörter, BLOBs, entschlüsselten DB-Dateien oder Benutzerbilder in Git übernehmen.**
