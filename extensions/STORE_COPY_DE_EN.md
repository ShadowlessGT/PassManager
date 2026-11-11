# Parola – Texte für Chrome Web Store und Firefox Add-ons (DE/EN)

**Entwurfsstand 11.11.2026 – erst nach Google-OAuth-E2E und Sicherheitsprüfung veröffentlichen.**

## Deutsch

**Name:** Parola – Passwortmanager

**Kurzbeschreibung:**
Passwörter verschlüsselt aufbewahren, Logins gezielt einfüllen und neue Zugänge nur mit Zustimmung speichern.

**Beschreibung:**
Parola ergänzt deinen Browser um einen verschlüsselten Passwort-Tresor, den du mit der Parola-App auf Android und künftig Windows nutzen kannst.

- Melde dich mit deinem Parola-Firebase-Konto an. Die Google-Anmeldung ist in Vorbereitung und benötigt vor dem Store-Release eine bestätigte OAuth-Konfiguration.
- Entsperre deinen Tresor mit deinem eigenen Master-Passwort.
- Fülle gespeicherte Zugangsdaten auf passenden HTTPS-Webseiten nur auf deinen Klick ein.
- Erlaube die Login-Erkennung individuell für einzelne Webseiten. Nach dem Absenden eines Login-Formulars kann Parola dich fragen: „Möchtest du diesen Login in Parola speichern?“ Erst deine ausdrückliche Bestätigung speichert ihn.
- Übertrage neue Einträge verschlüsselt in deinen Firebase-Cloud-Tresor. Die aktuellen Android-/Windows-Versionen erfordern für die Synchronisierung noch manuelle Cloud-Aktionen.

**Wie werden deine Daten geschützt?**

Deine Tresordaten werden lokal vor der Übertragung mit AES-256-GCM verschlüsselt. Der Schlüssel wird über PBKDF2-SHA-256 aus deinem separaten Master-Passwort abgeleitet. Firebase speichert verschlüsselte Inhalte, nicht deine Klartext-Passwörter. Die Anmeldung mit Google/Firebase bestätigt deine Identität, entschlüsselt aber nicht automatisch deinen Tresor.

Parola erkennt Logins nur auf HTTPS-Webseiten, für die du die Browserberechtigung erteilt hast. Vor dem bestätigten Speichern können die erkannten Login-Daten für maximal zwei Minuten im isolierten Arbeitsspeicher der Browser-Erweiterung stehen; danach werden sie verworfen. Wir senden keine unverschlüsselten Passwörter an Firebase.

Auch ein verschlüsselter Tresor bietet keine absolute Sicherheitsgarantie: Ein kompromittiertes Gerät oder ein schwaches Master-Passwort kann deine Daten gefährden.

**Datenschutzrichtlinie:** https://parola.shadowless-studios.eu/privacy.html
(Diese Seite vor Veröffentlichung auf die Browser-Erweiterung und die Google-Auth-Option aktualisieren.)

## English

**Name:** Parola – Password Manager

**Short description:**
Keep passwords encrypted, fill logins on request, and save new credentials only with your approval.

**Description:**
Parola brings an encrypted password vault to Chrome and Firefox, designed to work with the Parola app for Android and, in future, Windows.

- Sign in to your Parola Firebase account. Google sign-in will require verified OAuth setup before release.
- Unlock the vault with your separate master password.
- Fill saved login credentials only when you request it on a matching HTTPS website.
- Enable login detection individually for websites you trust. After a login form submission, Parola can ask if you'd like to save the credentials. Nothing is added until you confirm.
- Save an encrypted vault copy to Firebase. Automatic cross-device synchronization is not yet enabled; other clients currently require manual cloud backup/restore.

**How is your information protected?**

Vault content is encrypted locally with AES-256-GCM before being sent to Firebase. The encryption key is derived from your separate master password using PBKDF2-SHA-256. Firebase stores ciphertext, not plaintext passwords. Google/Firebase authentication identifies the account; it does not automatically unlock your encrypted vault.

Login detection only runs on HTTPS sites you individually authorize. Before your confirmation, detected login details may remain temporarily in the extension's isolated browser session memory for up to two minutes, after which they are discarded. No plaintext password is uploaded to Firebase.

No password manager can guarantee absolute security. Device compromise and weak master passwords remain risks.

**Privacy policy:** https://parola.shadowless-studios.eu/privacy.html
(Update the live policy to cover browser extension processing before release.)

## Prüfpunkt: Store-Datenangaben

- Authentifizierungsinformationen: Benutzername, Passwort und verschlüsselte Tresordaten – **ja, für die Funktion**.
- Persönlich identifizierbare Daten: E-Mail/Name aus Firebase-Konto – **ja, für Anmeldung**.
- Browseraktivität: von dir freigegebene Webseiten-/Login-Domains – **ja, nur im Rahmen der Funktion**.
- Analyse-/Werbetracking: **nicht implementiert**.
- Verkauf von Nutzerdaten: **nicht vorgesehen**.
- Google-Dienstkontoschlüssel und Master-Passwort in Firebase: **nein**.

Die finalen Angaben müssen mit tatsächlichem Verhalten, Datenschutzerklärung und Store-Richtlinien geprüft werden. Eine Store-Prüfung ersetzt keinen unabhängigen Sicherheitscheck.

**Aktuelle Zugriffsregel:** Automatische Login-Erkennung nur nach einer in Firebase bestätigten Google-Anmeldung (`provider: google.com`) plus ausdrücklicher Webseitenfreigabe. E-Mail/Passwort-Firebase-Sitzungen erlauben weiterhin manuelles Arbeiten, aber keinen automatischen Login-Wächter.
