# Parola Browser-Add-ons: einmalige Store-/Google-Einrichtung

**Live bestätigt am 12.11.2026:** Im Firebase-Projekt `password-manager-parola` ist Google als Anmeldeanbieter **aktiviert**. Die bestehende Firebase-Web-OAuth-Client-ID ist
`693424731365-i9rnvgav2pkbn4lbhmrk74u6cpd9m5fo.apps.googleusercontent.com`. Außerdem ist `parola.shadowless-studios.eu` als autorisierte Domain eingetragen.

**Kunden müssen nie OAuth oder Firebase konfigurieren.** Nur der Entwickler richtet die Erweiterungen einmal ein. Nutzer installieren sie aus dem Store, melden sich über Google bei Firebase an und entsperren ihren Parola-Tresor zusätzlich mit ihrem Master-Passwort.

## Was der Entwickler noch tun muss (konkret)

### 1. Chrome Web Store: Add-on als ENTWURF hochladen

[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

- Mit dem Entwicklerkonto anmelden; gegebenenfalls **einmalige Entwicklerregistrierung** abschließen.
- **„Add new item“** bzw. **„Neues Element hinzufügen“**.
- Datei: `parola-chrome-dev-0.2.0.zip` aus `Desktop\Parola-Browser-Addons-Test`.
- **Nicht veröffentlichen!** Google-Anmeldung in diesem Entwurf ist noch unkonfiguriert.
- Im Chrome Developer Dashboard unter **Package / Paket** die **Item ID** (Erweiterungs-ID) kopieren. Sie besteht aus **32 Kleinbuchstaben a–p**, z. B. `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (Beispielwert, nicht verwenden).

### 2. Google Cloud: exakt einen Chrome-Erweiterungsclient erstellen

[Google Auth Platform - Clients](https://console.cloud.google.com/auth/clients?project=password-manager-parola)

| Feld | Eingabe |
|---|---|
| Google Cloud-Projekt | `password-manager-parola` |
| Menü | **Google Auth Platform → Clients → Create Client** |
| Application Type / Anwendungstyp | **Chrome Extension / Chrome-Erweiterung** |
| Name | **Parola Chrome Add-on** |
| Item ID / Artikel-ID | Die 32-stellige **Item ID** aus Schritt 1 |
| Ergebnis | Neue **OAuth Client ID** des Typs Chrome Extension, endet auf `.apps.googleusercontent.com` |

**Nicht** die bestehende Web-Client-ID im Chrome-Manifest verwenden. Sie gehört zum Web-Client und ist nicht der Chrome-Erweiterungsclient. **Keinen Client-Secret- oder Dienstkontoschlüssel** in ZIPs eintragen.

### 3. Ich übernehme dann die technische Konfiguration

Sende lediglich diese zwei **öffentlichen** Kennungen in den Chat:

```text
Chrome Erweiterungs-ID: <32 Zeichen aus Chrome Developer Dashboard>
Chrome OAuth Client ID: <neue Chrome Extension OAuth Client ID>
```

Der lokale Helfer `PAROLA_GOOGLE_SETUP.cmd` kann beide Werte in die **gitignorierte** `.env.local` eintragen. Danach wird das ZIP mit der richtigen `manifest.oauth2` gebaut. Die Chrome-Nutzer müssen diese Einrichtung **nicht** vornehmen.

Alternativ lässt sich der Helfer direkt starten:
```bat
PAROLA_GOOGLE_SETUP.cmd
```
Er bietet Optionen für Live-Status, beide IDs, genauen Bericht auf dem Desktop und Test-ZIP-Build.

### 4. Firefox: erste Store-Einreichung vorbereiten

[Mozilla Add-ons Developer Hub](https://addons.mozilla.org/developers/)

- Mit Mozilla-Konto anmelden.
- `parola-firefox-dev-0.2.0.zip` als **Entwurf/privates Testpaket** hochladen, noch nicht veröffentlichen.
- Die Add-on-ID ist bereits **`parola@shadowless-studios.eu`**. Für Firefox ist keine Chrome-Web-Store-ID nötig.
- **Noch offen:** Für Firefox muss der Google-OAuth-Redirect zuverlässig für diese Erweiterung funktionieren. Die vorhandene Google-**Web**-Client-ID ist zwar bereits eingerichtet, kann aber nicht einfach als Firefox-Direkt-Client für eine unbestätigte `extensions.allizom.org`-Weiterleitung eingesetzt werden. Ein sicherer, über die eigene Parola-Domain abgewickelter Anmelde-Callback ist zu prüfen/implementieren. **Nicht mit einer nicht geprüften Google-Anmeldung live gehen.**
- Mozilla-Signierung, Store-Datenschutz-Formulare, Screenshots und abschließende Tests vor öffentlichem Release.

## Bereits erledigt

- Firebase Google-Anmeldung aktiv, Domain freigeschaltet (read-only über offizielle API überprüft).
- Bestehende Firebase Web API, Firebase Auth und Firestore werden wiederverwendet.
- Chrome/Firefox Add-on Quellen und ZIP-Entwürfe.
- Verschlüsseltes Vault-Format (AES-256-GCM, PBKDF2-SHA256 600.000 Iterationen).
- Zustimmungspflichtige Login-Erkennung pro HTTPS-Domain.
- Separate Anmeldung mit Google und Parola-Masterpasswort vorbereitet.
- Bisherige Node- und Parola-App-Tests; Mozilla-Linter ohne Warnung im letzten Testlauf.

## Wichtige Einschränkungen

**Die Add-ons sind noch Entwicklungsstände.** Google-Login ist erst nach OAuth-Einrichtung und realem Test bestätigt. Firebase erhält ausschließlich lokal verschlüsselte Tresore, jedoch werden erkannte Formulareingaben vor der Verschlüsselung kurz im Browser-Arbeitsspeicher gehalten. Kein Passwortmanager ist gegen Schadsoftware auf dem Endgerät absolut sicher.

Auch die automatische Übernahme von Cloud-Änderungen in die Android-App ist noch nicht aktiv. Noch ist ein manueller Cloud-Download erforderlich.

**Niemals** bestehende echte Vaults für Testimporte überschreiben. Google-Cloud-Konfiguration nicht verändern, wenn ein vorhandener Nutzer dadurch seine UID oder verschlüsselten Daten verlieren könnte.

## Offizielle Referenzen

- Chrome Extension OAuth: https://developers.google.com/workspace/guides/create-credentials
- Chrome Web Store Publish: https://developer.chrome.com/docs/webstore/publish
- Mozilla OAuth redirect: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity
- Firebase Google Sign-In in Browser-Erweiterungen: https://firebase.google.com/docs/auth/web/chrome-extension
