# Parola – Feature-Ausbau 2026-11-13

Repository: ShadowlessGT/PassManager
Branch: feat/parola-security-ux-20261113
Worktree: N:\Shadowless Studios\Apps\PassManager-Features-20261113
Base: f3dc5c1, Branch feat/parola-migration-security-20261113
Version bleibt 0.7.4 (VersionCode 21); laufende Veröffentlichung 0.7.5 unangetastet.

## Implementiert

- Sicherheitscenter: lokaler heuristischer Score, schwache/kurze/mehrfach verwendete Passwörter, direkte Eintragsaktionen (kein vollständiger Sicherheitsnachweis).
- Statistiken: Passwortlängen-Histogramm mit Filtern, Stärkeverteilung, häufigste Kategorien und Feldtypen.
- Archiv und Papierkorb: verschlüsselt gespeicherte Zustände, Wiederherstellung, endgültiges Löschen nur aus Papierkorb mit erneuter Bestätigung.
- Import/Export-Center aus bestehendem Migrationsbranch: verschlüsselte .parola-Dateien, CSV/XLSX-Import, Fremdimport und CSV-Export. Zusätzlich echter XLSX-Export mit Wiederimport-Test und Android Storage Access Framework für Binärdateien; unverschlüsselte Exporte nur nach Bestätigung.
- Automatische lokale verschlüsselte Wiederherstellungspunkte: optional, Intervall/Aufbewahrung, Export und geprüfte Wiederherstellung. Alte Snapshots nach Schlüsseländerung/Tresorersatz entfernt. Speicherung ausschließlich im privaten App-Speicher; keine externen Offline-Backups.
- Kategorie-Kacheln und Listenansicht, eigene Farben und bestehende Kategorie-Icons.
- Hierarchische Kategorien/Unterordner, Mehrfachzuordnung und Tags, Suchfilter.
- Design: Akzentfarben, Kontrast, Kopierbuttons, Passwortmaskierung, lokale Eintragsbilder und nur nach ausdrücklicher Zustimmung direkter HTTPS-Favicon-Abruf ohne Referrer. Keine externen Icon-Aggregatoren.
- Dynamische lokale App-Version und statisches Entwicklungs-Changelog.

## Aus Sicherheitsgründen nicht als fertig ausgegeben

- Android-weites Autofill: benötigt authentifizierten nativen Autofill/Credential Provider, sichere App-/Domainzuordnung, Nutzerfreigabe und garantierte Nichtpersistenz von Klartext in anderen Prozessen.
- Bidirektionale automatische Cloud-Synchronisierung: vorhandener manueller Firebase-Backup/CAS-Schutz bleibt. Benötigt geräteübergreifendes Schlüsselprotokoll, revisionsbasierte Eintrags-Merges, Lösch-Tombstones und Konflikt-UI; kein blindes Überschreiben.
- Geschützter PDF-Druckexport: noch nicht vorhanden; klartextführende PDF-Dateien besonders sensibel.
- Android Launcher-Icon-Wechsel und dynamisches Online-Changelog: nicht fertig.
- Externes Backupziel und Android WorkManager-Hintergrund-Sicherung: noch nicht implementiert. Snapshots werden bei App-Aktivität vorgenommen.

## Prüfungen und offene Qualitätssicherung

- npm test: inklusive Archiv, Sicherheit, Kategorien, Favicon, Snapshot-Regeln, Excel-Rundlauf.
- npm run build: TypeScript/Vite erfolgreich.
- npx cap sync android: nur isolierter Worktree.
- Offline Android Debug-Java-Kompilierung erfolgreich.
- Keine echten Benutzer-Tresore gelesen, geändert oder migriert; kein Merge, Play Upload, OTA Deploy oder GitHub Actions.
- Vor Freigabe: Gerätetests mit Wegwerf-Tresor, Android SAF Export/Import, Passwortänderung mit Snapshots, Restore/Undo, Hintergrundsperre und Berechtigungen durchführen.
