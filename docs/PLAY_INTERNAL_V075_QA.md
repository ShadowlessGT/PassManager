# Parola 0.7.5 / VersionCode 22 – integrierter interner Android-Test

Status: Integrationsstand für Play-internen Gerätetest, nicht für Produktion freigegeben.

## Enthaltene Änderungen
- Google-Firebase-Anmeldung und registrierte Upload-/Play-Signing-Zertifikate aus `fix/parola-google-signin-play-cert-v074`.
- Offizieller Chrome/Firefox-Produktname und Store-Hilfsskripte aus `origin/main`.
- Import/Export und Sicherheitsfunktionen aus `feat/parola-migration-security-20261113`.
- Sicherheitscenter, Archiv, Papierkorb, verschlüsselte Snapshots, Statistik, Kategorien und XLSX-Export aus `feat/parola-security-ux-20261113`.
- Direkter SQLCipher-4-Password-Safe-.db-Import mit nativer Android-Dateiauswahl und lokalem Quell-Master-Passwort aus `feat/parola-passwordsafe-sqlcipher-import-20261113`.

Die Prototype-Branch `feat/parola-browser-shared-google-login` ist **nicht** in den Android-Release integriert. Hosted Browser Google OAuth ist dort noch nicht End-to-End geprüft und nicht veröffentlicht.

## Was man auf einem echten Android-Gerät testen muss

1. Installation ausschließlich aus dem internen Google-Play-Test. Google-Anmeldung und erneute Anmeldung prüfen; Fehlermeldung ohne Geheimnisse notieren.
2. Mit einem isolierten Test-Tresor Datensatz anlegen; App schließen, wieder entsperren, Biometrie, Hintergrundsperre und Display-aus-Sperre testen.
3. Verschlüsseltes `.parola`-Backup exportieren; Import mit korrektem und falschem Master-Passwort prüfen; vorhandene Einträge dürfen nicht überschrieben werden.
4. CSV und XLSX mit Testpasswörtern importieren/exportieren, identische Spalten und Zusatzfelder vergleichen. Unverschlüsselte Exporte sofort sicher löschen.
5. Direktimport einer verschlüsselten Password-Safe-`.db` über **Importieren → Password Safe** testen. Das bisherige Master-Passwort ausschließlich in der App eingeben, nicht über Chats oder Logs versenden.
6. Nach Entschlüsselung **Eintragsanzahl, Kategorien, Bilder, besondere Zusatzfelder, TOTP-/2FA-Daten** mit Original-App vergleichen. Unbekannte Tabellen oder ausgelassene Binärfelder müssen als Warnung erscheinen. Dieser Import ist bis dahin technisch vorbereitet, aber nicht vollständig verifiziert.
7. Archiv/Papierkorb, Wiederherstellungspunkte und Passwortwechsel mit einem Test-Tresor durchführen.
8. Screenshot-Schutz und Zwischenablage-Clear auf dem Gerät prüfen. Selbstzerstörungsmodus **niemals mit echten Daten testen**, nur mit separatem wegwerfbarem Tresor und zusätzlichem Backup.
9. Google-Play-In-App-Käufe, App Check und vorhandene Cloud-Sicherung nach Update testen, ohne bestehende Daten zu überschreiben.
10. Bekannte Android-15-Edge-to-edge-Warnung separat prüfen. DEX-Optimierung wurde technisch durch R8 aktiviert, aber die Play-Warnung kann erst nach der Google-Analyse bewertet werden.

## Abnahmebedingungen
- Keine ungeklärten Datenverluste oder falschen Passwort-Importe.
- Echtes Google-Login funktioniert auf der von Google Play signierten App.
- Import/Export einschließlich verschlüsseltem Backup getestet.
- Alte Test- und Produktionsinstallationen lassen sich sicher aktualisieren.
- Keine Übertragung des Master-Passworts an Server oder Chat.
- Open Testing und Production bleiben während dieser Phase unverändert.

## Live-Veröffentlichungsstatus beim Beginn
- Intern: VersionCode 21 / Parola 0.7.4 – `completed`
- Offen (beta): VersionCode 20 / Parola 0.7.3 – `completed`
- Produktion: VersionCode 21 / Parola 0.7.4 – `completed`
- Neu: VersionCode 22 / Parola 0.7.5 – ausschließlich interner Test nach erfolgreichem signierten Upload.
