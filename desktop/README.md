# Parola für Windows – Tauri-2-Grundstruktur

Dieser Ordner bereitet eine **lokale Windows-Desktop-App** vor. Sie verwendet die vorhandene React-Oberfläche, `src/crypto.ts` (PBKDF2 mit 600.000 Iterationen/AES-256-GCM), `src/storage.ts` (verschlüsselte IndexedDB) und `src/cloud.ts` (Firebase Auth/Firestore). **Kein neues Serverkonto, keine zweite Datenbank und keine Klartext-Passwörter in Firebase.**

## Entwicklung auf Windows

Benötigt: Node.js, Rust stable + MSVC-Buildtools, Microsoft WebView2 und die Tauri-v2-CLI.

```powershell
cd "N:\Shadowless Studios\Apps\PassManager"
npm ci
cargo install tauri-cli --version "^2" --locked
cd desktop
cargo tauri dev
```

`cargo tauri build` erstellt nach Einrichtung der Windows-Buildwerkzeuge eine lokal ausführbare App. **Installer-Bundles sind vorerst bewusst deaktiviert** (`bundle.active=false`), bis App-Symbol, Codesignatur, Upgradepfad und echte QA geklärt sind.

## Sicherheitsstatus und Grenzen

- Die WebView lädt nur lokal gebaute Parola-Dateien, keine Hostinger-Live-App und kein remote JavaScript.
- Tauri-Capabilities geben der Oberfläche **keinen** generischen Dateisystem-, Shell- oder Native-Messaging-Zugriff.
- Die vorhandene Firebase-Anmeldung und die **manuellen** Cloud-Upload-/Download-Aktionen funktionieren als gemeinsames Tresorformat. Automatische bidirektionale Synchronisierung mit Konfliktauflösung ist **noch nicht** aktiviert.
- Der Windows-Tresor bleibt separat verschlüsselt in seinem WebView-Profil. Das Master-Passwort wird nicht an Tauri/Rust oder Firebase gesendet.
- Android-Biometrie und Google Play Billing sind nur auf dem nativen Android-Gerät aktiv. Eine Windows-Hello-Integration ist noch **nicht** implementiert.
- Mit dem gleichen Firebase-Konto und Master-Passwort kann ein ausdrücklich hochgeladener Tresor von anderen Geräten wiederhergestellt werden. Nie einen älteren Stand blind über neuere Cloud-Daten schreiben.
- Build auf Windows, App-Check-Konfiguration, Firebase-Authentifizierung, Vault-Backup/Restore und Security-Review stehen noch aus. **Noch kein signierter Windows-Installer**.

Der Chrome-/Firefox-Integrationspfad wird getrennt unter `extensions/` entwickelt. Direkter Zugriff auf browserinterne, bereits gespeicherte Passwörter wird nicht angenommen.
