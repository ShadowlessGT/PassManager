# Parola 0.7.6 – interner Play-Test bestätigt

**Datum (Deutschland):** 15.11.2026, 04:09 Uhr

## Veröffentlichung
- Android package: `com.shadowlessstudios.passwordmanager`
- VersionName: **0.7.6**
- VersionCode: **23**
- Ausgangsbasis: `release/parola-integrated-internal-v075`
- Branding-Branch: `feat/parola-new-logo-v076`
- Quellcode-Commit für das Build: `25ad296`
- Veröffentlichung nur im **internen Test**.
- Google Play API bestätigte: `INTERNAL_TEST_RELEASE_CONFIRMED=TRUE`
- Separater API-Readback: internal=[23], beta=[20], production=[21].
- AAB: `tools/play-release/out/Parola-v0.7.6-vc23-SIGNED.aab` (nicht in Git).
- SHA-256: `253e4a3250b8a6c777ad9be190d58a82731f0f60f760cde1d0eeaeef74cadeda`
- Upload-Zertifikat stimmt mit vorheriger Parola-Version überein.
- Bundlegröße: 35,301,395 Bytes.

## Verifikation
- App-Tests 79/79.
- WebExtension-Tests 20/20.
- Browser Store Setup-Tests 3/3.
- Web- und Android-Release-Build erfolgreich.
- Google Play Bundle-Upload mit API-Readback bestätigt.

## Noch nicht als abgeschlossen betrachten
- Gerätesichtprüfung des neuen Launchers und des internen Parola-Kopfzeilen-Logos.
- Direkter Password Safe SQLCipher-.db-Import mit lokal eingegebenem Passwort; konkretes DB-Schema weiterhin noch nicht mit echtem Tresor gegengeprüft.
- Android 15 Edge-to-edge-Warnung wurde hier nicht adressiert.
- Öffentlicher Google-Play-Store-Eintrag hat eine eigene Store-Icon-Grafik, die beim APK/AAB-Upload nicht automatisch aktualisiert wird.
- Browser Google Sign-In Prototype ist unabhängig und bleibt in eigenem Branch.

## Hintergrund
Der Browser-Prototyp `feat/parola-browser-shared-google-login` liegt zwei Commits vor dem integrierten 0.7.5, betrifft jedoch den Browser/Hosted Login und nicht den aktuellen Android-Release. Er wurde nicht ungeprüft übernommen.
