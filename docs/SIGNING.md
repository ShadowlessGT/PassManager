# Parola / Android Upload-Keystore

Vorhandener Shadowless-Studios-Keystore (am 27.10.2026 lokal bestaetigt):
`G:\Meine Ablage\Keystore für Google publishing\ShadowlessStudios.keystore`

Das ist ein vorhandener *gemeinsamer* Keystore-Container. Fuer Parola ist ein eigener Alias im Container sinnvoll; den Alias erst per Keystore-Manager bestaetigen/neu anlegen. Bestehende Aliase anderer Apps niemals ueberschreiben.

- Android applicationId: `com.shadowlessstudios.passwordmanager`
- Nur Upload-Key fuer Play App Signing verwenden.
- Keystore und Passwoerter bleiben ausserhalb des Repositories.
- Keine Debug-Signatur fuer den Google-Play-Release verwenden.
- Signierten `.aab`-Upload erst nach Einrichtung in Play Console und Testfreigabe durchfuehren.
