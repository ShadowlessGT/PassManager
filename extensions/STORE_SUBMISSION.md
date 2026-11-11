# Parola – Chrome und Firefox Add-on Veröffentlichung

Stand: 11. November 2026. **Entwicklungsversion 0.2.0, noch nicht öffentlich freigeben.**
App-Name: Parola – Passwort-Tresor
Firebase-Projekt: password-manager-parola

## Nutzererlebnis

1. Nutzer klickt in Chrome oder Firefox auf das Parola-Symbol und meldet sich bei **Firebase Authentication** an, vorzugsweise über Google.
2. Anschließend entsperrt der Nutzer seinen Parola-Tresor mit dem **separaten Master-Passwort**. Google kennt dieses Passwort nicht.
3. Für eine beliebige HTTPS-Webseite kann der Nutzer einmal ausdrücklich die Einstellung **„Automatische Login-Nachfrage auf dieser Website erlauben“** aktivieren. Der Browser bestätigt die Webseitenberechtigung.
4. Beim Absenden eines Loginformulars (nicht beim Tippen) erkennt die Erweiterung Benutzername/Passwort. Wenn die Seite danach keinen sichtbaren Passwortdialog mehr hat, erscheint: **„Parola · Login erkannt – Möchtest du diesen Login verschlüsselt in Parola speichern?“**
5. Bei „In Parola speichern“ öffnet sich die Parola-Prüfansicht. Der Nutzer entsperrt nötigenfalls den Cloud-Tresor, sieht die vorgeschlagenen Daten und klickt **„Verschlüsselt in Firebase speichern“**. Erst dann wird ein neues AES-256-GCM-Tresordokument nach Firebase geschrieben. Existierende Logins werden nur nach erneuter Bestätigung aktualisiert. Der Cloud-Revision-Check verhindert stilles Überschreiben einer Änderung auf einem anderen Gerät.
6. Bei „Nicht jetzt“ wird der zwischengespeicherte Vorschlag verworfen. Er läuft auch nach **zwei Minuten** ab.

**Wichtig:** Ein Browser kann einen erfolgreichen Login nicht universell bestätigen. Der Ablauf erkennt daher einen *Login-Versuch und eine anschließende Seitenänderung*, nicht den serverseitigen Erfolg. Manche SPA-Logins, Passkeys, Zwei-Faktor-Abläufe und Spezialformulare werden nicht erkannt. Formularerkennung funktioniert nur auf zuvor ausdrücklich genehmigten HTTPS-Webseiten. Browserintern bereits gespeicherte Passwörter können nicht heimlich übernommen werden; der bestehende CSV-Import ist dafür der vorgesehene Weg.

## Datenschutz- und Sicherheitsbeschreibung (transparent)

> Deine Einträge werden auf deinem Gerät mit einem nur aus deinem Parola-Master-Passwort abgeleiteten Schlüssel verschlüsselt (PBKDF2-SHA-256, 600.000 Iterationen; AES-256-GCM). Firebase speichert den verschlüsselten Tresor. Die Google-Anmeldung bestätigt deine Identität, aber Google erhält dadurch nicht dein Master-Passwort. Das Add-on fragt vor dem Übernehmen eines neu erkannten Logins. Nur für ausdrücklich erlaubte HTTPS-Webseiten überwacht es Login-Formulare. Ein erkanntes Passwort kann vor dem Speichern für höchstens zwei Minuten im isolierten Sitzungsspeicher der Erweiterung **kurzzeitig unverschlüsselt im Arbeitsspeicher** liegen. Es wird nicht als Klartext in Firebase oder in dauerhafter Browser-Synchronisierung gespeichert.

**Keine absolute Sicherheitsgarantie:** Auf entsperrten Geräten kann Schadsoftware oder ein kompromittierter Browser vertrauliche Daten abgreifen. Schwache Master-Passwörter, manipulierte Webseiten und Sicherheitslücken bleiben Risiken. Nicht „unhackbar“, „100% sicher“ oder „niemand kann jemals zugreifen“ behaupten. Ein unabhängiger Security-Review und echte Browser-/Firebase-Tests sind Voraussetzung für öffentliche Nutzer.

## Google-Anmeldung einrichten

Die Firebase-Webkonfiguration ist in .env.local bereits vorhanden und wird nur in das lokal gebaute Paket geschrieben. **Aktuell fehlen OAuth-Client-IDs, daher funktioniert „Mit Google anmelden“ noch nicht.** Ohne OAuth-Konfiguration ist der Button vorhanden, zeigt aber eine Fehlermeldung.

- Firebase Authentication im Projekt `password-manager-parola`: Google als Anmeldeanbieter aktivieren und Testnutzer prüfen.
- **Chrome:** Chrome-Web-Store-Entwicklerkonto und feste Erweiterungs-ID einrichten. In Google Cloud OAuth-Clients einen Clienttyp **Chrome Extension** für exakt diese ID erstellen und die zugehörige öffentliche Client-ID lokal als `VITE_GOOGLE_CHROME_OAUTH_CLIENT_ID=...` hinterlegen. Build schreibt `manifest.oauth2` mit `openid email profile`; Google-Zugriffstoken wird über `chrome.identity.getAuthToken` angefordert und mit Firebase `accounts:signInWithIdp` verknüpft.
- **Firefox:** eigenes OAuth-Clientprojekt für das feste Firefox-Add-on `parola@shadowless-studios.eu` und den exakten Rückruf von `browser.identity.getRedirectURL('parola')` bereitstellen. Die Redirect-Registrierung muss bei Google tatsächlich akzeptiert sein; sonst ist der direkte OAuth-Flow nicht einsatzfähig. Öffentliche Firefox-Client-ID lokal als `VITE_GOOGLE_FIREFOX_OAUTH_CLIENT_ID=...` hinterlegen. Firefox verwendet `browser.identity.launchWebAuthFlow`, prüft `state` und übergibt das Google-Zugriffstoken an Firebase. Falls Google diese Redirect-Art ablehnt, ist ein separater, überprüfter Auth-Callback über eine eigene Parola-Domain nötig – **nicht** Client-Secrets im Add-on speichern.
- Bestehende Firebase-E-Mail/Passwort-Konten bleiben als Fallback unterstützt. Google-Anmeldung und E-Mail/Passwort können unterschiedliche Firebase-UIDs erzeugen, wenn Konten nicht ausdrücklich verknüpft sind; solche Tresore **niemals automatisch zusammenführen oder überschreiben**.

## Lokal erstellen

```bat
cd /d "N:\Shadowless Studios\Apps\PassManager"
BUILD_EXTENSIONS.cmd
```

Oder einzeln:

```powershell
npm run test:extension
npm run extension:build
```

Artefakte werden lokal unter `browser-build/` erzeugt (gitignored):
- `parola-chrome-dev-0.2.0.zip`
- `parola-firefox-dev-0.2.0.zip`
- `chrome/` und `firefox/` entpackt zum Testen.

Die Pakete enthalten keine Google-Dienstkontoschlüssel, kein Master-Passwort, keine Tresore und keine .env-Dateien. Der **öffentliche Firebase-Web-API-Key** ist wie bei anderen Firebase-Clientanwendungen enthalten.

## Chrome Web Store

1. https://chrome.google.com/webstore/devconsole öffnen und als Chrome-Web-Store-Entwickler registrieren. Einmalige Entwickler-Registrierungsgebühr und Konto-/E-Mail-Verifizierung können erforderlich sein. **Das ist unabhängig vom Google-Play-Entwicklerkonto.**
2. Beim ersten Test zunächst Entwickler-ID und OAuth-Client einrichten. `VITE_GOOGLE_CHROME_OAUTH_CLIENT_ID` setzen und erneut bauen.
3. Im Dashboard „Add new item“ -> `parola-chrome-dev-0.2.0.zip` hochladen.
4. Deutscher/englischer Store-Titel, Logo, Screenshots, detaillierte Datenschutzerklärung (`https://parola.shadowless-studios.eu/privacy.html`) und die **Datenverwendungs-/Berechtigungsangaben** vervollständigen. Die optionalen HTTPS-Hostberechtigungen erklären.
5. Erst nach End-to-End-Test und Sicherheitsprüfung Sichtbarkeit/Prüfung/Veröffentlichung auswählen. Upload einer Datei heißt **nicht** automatisch öffentlich.

Offizielle Anleitung: https://developer.chrome.com/docs/webstore/register und https://developer.chrome.com/docs/webstore/publish

## Firefox Add-ons (AMO)

1. Mit Mozilla-Konto bei https://addons.mozilla.org/developers/ anmelden.
2. „Submit New Add-on“ -> „On this site“ für öffentlichen Add-on-Store. Für eigene Verteilung „On your own“ mit Signierung wählen.
3. Eigenen Firefox-Build mit registriertem OAuth-Client erstellen; `parola-firefox-dev-0.2.0.zip` hochladen.
4. Beschreibung, Datenschutz, Quelldateien (falls nötig), Entwicklerkontakt und nötige Berechtigungen erklären; Mozilla-Prüfung und Signierung abwarten. Unsignierte Add-ons laufen in regulärem Firefox nicht dauerhaft.

Offiziell: https://www.extensionworkshop.com/documentation/publish/submitting-an-add-on/

## Vor Store-Release zwingend

- Chrome/Firefox in getrennten frischen Testprofilen testen, keine echten Passwort-Daten.
- Google OAuth mit realer **Test-Firebase-UID**, Master-Entsperrung, Backup/Restore, Änderung und Dubletten testen.
- Szenarien: richtiger/falscher Login, Seitenneuladen, 2FA, OAuth-Redirect, neue Domain, Phishing-Subdomain, mehrere Formulare, Browser-Neustart.
- Speicherhinweis nach Login muss funktionieren und darf nicht auf Registrierungs-/Passwortänderungsformularen fälschlich erscheinen.
- Opt-out/Permission-Revoke muss die Hintergrundüberwachung stoppen.
- Cross-Device-Sync: Android/Windows **noch nur manuell** Cloud-Download/Upload; kein automatischer Echtzeit-Push.
- Datenschutzseite rechtlich und inhaltlich auf die tatsächlich verarbeiteten Browser-Passwörter und Google Auth anpassen.
- Firebase Security Rules/App Check kompatibel und Cloud-Schreibkonflikte getestet.
- Vor echtem Store-Upload externe Sicherheitsprüfung, Policies und Testpaket-Freigabe.

### Firefox Berechtigungen und Mindestversion

Firefox benötigt mindestens Version **142.0**, damit die neue Mozilla-Dateneinwilligung korrekt verarbeitet wird. Das Manifest deklariert die für Parola tatsächlich verarbeiteten Kategorien **authenticationInfo**, **personallyIdentifyingInfo** und **browsingActivity** als erforderlich; der Zugriff auf konkrete HTTPS-Webseiten wird zusätzlich nur bei ausdrücklicher Webseitenfreigabe angefordert. Der Mozilla-Linter meldet derzeit null Fehler und null Warnungen.

**Aktuelle Zugriffsregel:** Automatische Login-Erkennung nur nach einer in Firebase bestätigten Google-Anmeldung (`provider: google.com`) plus ausdrücklicher Webseitenfreigabe. E-Mail/Passwort-Firebase-Sitzungen erlauben weiterhin manuelles Arbeiten, aber keinen automatischen Login-Wächter.
