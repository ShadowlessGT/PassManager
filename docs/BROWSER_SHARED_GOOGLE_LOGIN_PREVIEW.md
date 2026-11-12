# Parola – gemeinsamer Google-Login für Chrome und Firefox (ENTWICKLUNGSPROTOTYP)

**Status: noch nicht veröffentlicht, noch nicht auf Hostinger deployed, keine echte Google-E2E-Anmeldung durchgeführt.**
Branch: `feat/parola-browser-shared-google-login`. Die produktive Android-App bleibt unangetastet.

## Warum dieser Weg?

Die bestehende Parola-Firebase-Konfiguration (`password-manager-parola`) hat den Google-Provider bereits eingeschaltet. Chrome und Firefox müssen nicht zwingend zwei weitere Google-OAuth-Clients verwenden: Stattdessen öffnen beide Add-ons über die offizielle Browser-`identity.launchWebAuthFlow`-API eine **eigene** HTTPS-Anmeldeseite auf `https://parola.shadowless-studios.eu/extension-login.html`. **Dort** meldet sich der Nutzer mit dem bestehenden Firebase-Google-Provider an. Die Web-Client-ID ist bereits eingerichtet.

## Sicherheitskonzept

- Eine einmalige ECDH-P-256-Schlüsselpaarung wird **im Add-on** für den aktuellen Login erzeugt, privater Schlüssel bleibt ausschließlich im RAM des Add-ons.
- Die gehostete Seite kann nur für eine **explizit in der Site-Build-Konfiguration erlaubte Rückleitungsadresse** Google-Anmeldung anbieten.
- Die gehostete Seite signiert den Benutzer mit Firebase Web SDK / `signInWithPopup` und `inMemoryPersistence` ein.
- Die Firebase-Sitzung (ID-Token, Refresh-Token, UID) wird **vor** der Browser-Rückleitung mit ECDH + HKDF-SHA256 + AES-256-GCM verschlüsselt; auch im URL-Fragment steht **kein lesbares Token**.
- Rückleitung und Status sind in HKDF und AES-GCM-AAD eingebunden; die Gegenseite prüft exakte Zieladresse, frischen Zufallsstatus und Authenticated Encryption.
- Das Website-Konto wird aus dem In-Memory-Web-Firebase-SDK direkt wieder abgemeldet. Der verschlüsselte Tresor bleibt unverändert; sein Master-Passwort wird niemals auf der Login-Seite eingegeben.
- Keine Google-Dienstkonten, keine OAuth-Client-Secrets und kein Klartext-Tresor in Erweiterungen/Hostinger.
- **Grenzen:** Die auf Hostinger laufende Anmeldeseite und ihr JavaScript müssen besonders geschützt werden. Angreifer mit Kontrolle über die gehostete Seite könnten die kurzzeitig von Firebase erhaltene Sitzung vor der Verschlüsselung abgreifen. Chrome/Firefox WebAuthFlow + Firebase-Popup muss auf echten Browsern getestet werden. Das Browser-Login allein entschlüsselt keinen Tresor.

## Derzeitige Freigabesperren

In der Test- und Site-Konfiguration ist `VITE_PAROLA_APPROVED_EXTENSION_REDIRECTS` standardmäßig **leer**. Damit bleibt der Google-Anmeldebutton der Hosted-Seite deaktiviert, selbst wenn jemand sie zufällig aufruft. **Bitte diese Sperre nicht umgehen.**

### Einmalige Daten für die Allowlist

**Chrome**: Chrome Web Store Developer Dashboard → `Add new item` → vorhandenes *0.2.0-Entwurfs-ZIP* hochladen → **Item ID**, 32 Kleinbuchstaben `a`–`p`, kopieren. Daraus wird exakt `https://CHROME_ITEM_ID.chromiumapp.org/parola`.

**Firefox**: Die Add-on-ID steht fest: `parola@shadowless-studios.eu`. Die **exakte** Identitäts-Callback-URL im temporär geladenen Firefox-Add-on abfragen: `browser.identity.getRedirectURL('parola')` (je nach Firefox-Version wird der Chrome-Pfadparameter ignoriert). Diese URL muss auf `.extensions.allizom.org` enden und bleibt nach Festlegung der Firefox-Add-on-ID stabil.

### Lokaler Setup-Helfer

```powershell
cd "N:\Shadowless Studios\Apps\PassManager-WebAuth-Bridge"
node scripts/browser-auth-redirect-setup.mjs --status
node scripts/browser-auth-redirect-setup.mjs --chrome-id <CHROME_ITEM_ID>
node scripts/browser-auth-redirect-setup.mjs --firefox-url <EXAKTE_FIREFOX_CALLBACK_URL>
npm run test:extension
npm run build:site
npm run extension:build
```

Der Helfer schreibt ausschließlich in die **gitignorierte** `.env.local`. Keine Firebase-Rules, Google Cloud oder Store-Einträge werden automatisch geändert. Die Website darf erst nach echten Tests, Review der Security Headers und gezielter, freigegebener Hostinger-Deployment-Probe veröffentlicht werden. Danach können die finalen Add-ons in den Stores zur Prüfung eingereicht werden.

## Technisch vorbereitet

- Gemeinsames ECDH-AES-GCM-Protokoll: `extensions/shared/google-handoff.mjs`
- Cross-Browser-Extension-Einstieg: `extensions/shared/google-auth.mjs`
- Webseite: `site/extension-login.html`, `site/extension-login.js`
- Isolierter Seiten-Build: `npm run build:site`, schreibt in `site-dist/`
- Chrome-/Firefox-Vorschau: `browser-build/parola-chrome-dev-0.3.0.zip` und `...firefox-dev-0.3.0.zip`
- Entwicklungstests: `npm run test:extension`, Google-Handoff-Tests auf unerlaubte Domains, geänderte Sitzungen, falsche Schlüssel, verschlüsselte Callback-Daten.

## Noch vor öffentlichem Release zwingend

1. Genaue Chrome/Firefox Callback-Adressen in Site-Allowlist aufnehmen und vom Google Login nur für diese erlauben.
2. Login mit **echtem Google-Testkonto** in Chrome und Firefox: Abbruch, falsches Konto, erneutes Öffnen, Site-Navigation, Firefox MV3, Sitzung erneuern, Signout.
3. Firebase-Credentials nach erfolgreichem Handoff über Firebase Auth sicher validieren; Account UID und Provider kontrollieren.
4. Mit Dummy-Tresor Firestore-Download, Entschlüsselung, Speichern mit Bestätigung, Cloud-Konflikt und manuellen Android-Reimport testen.
5. Hostinger-Network- und XSS-Sicherheitsreview, HTTP-CSP-Header, Cache-Control: no-store und keine Logs für Login-Fragmente.
6. Keine automatischen Passwortübernahmen ohne explizite Erlaubnis; Datenschutzseite für Add-ons aktualisieren.
7. **Erst dann** Store-Pakete und Login-Webseite veröffentlichen.

Diese Testimplementierung ersetzt die frühere separate OAuth-Client-Vorbereitung **noch nicht produktiv**, sondern prüft eine einfachere Variante. Die aktuelle veröffentlichte Android-App und die alten 0.2.0-Entwurfs-ZIPs bleiben unverändert.
