# Parola 0.7.6 – Logo und Launcher-Icons

Releasekandidat: `0.7.6`, Android `versionCode 23`.

## Ausgangspunkt
In Parola 0.7.5 waren alle fertigen Android-Feature-Branches aus 2026-11-13 enthalten. Nur der separate Browser-Login-Prototyp `feat/parola-browser-shared-google-login` hatte noch zwei zusätzliche Commits; er ist nicht als Android-Funktion freigegeben und wurde daher nicht gemergt.

## Brandingquelle
Datei: `M:\Shadowless Studios\DATA\Password Manager - Parola\Glänzendes Cybersecurity-Schild mit Passwortsymbol-5.png`
Originalgröße 1254 x 1254 Pixel, RGBA, transparent.
SHA-256: `398fdc1ce64c2b5146b3eb5b6cf319682e85cf052f2039eee273939aaba41228`.

## Geänderte Assets
- `public/parola-icon.png`: exakt die originale Datei, die App nutzt sie bereits auf Login-Seite und in der Kopfzeile.
- `public/favicon.png`: transparentes quadratisches Favicon, im `index.html` eingebunden.
- `public/parola-play-icon-512.png`: 512x512-RGB-PNG für optionalen separaten Google-Play-Store-Grafikabgleich (nicht automatisch in Play Console gesetzt).
- `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}`: neue Launcher-Symbole in regulärer, runder und adaptiver Vordergrund-/Hintergrundvariante.
- `android/app/src/main/res/mipmap-anydpi-v26`: adaptive Verknüpfung auf die neuen PNG-Ebenen; altes Android-Standard-Vektorsymbol wird nicht mehr verwendet.
- Reproduzierbares Skript: `scripts/build_parola_logo.py`.

Es wurden keine Passwörter, Datenbanken oder Firebase-Einstellungen verändert.

## Tests und Freigabegate
- 79 App-Vitest-Tests erfolgreich.
- 20 Browser-Extension-Tests erfolgreich.
- 3 Store-Setup-Tests erfolgreich.
- TypeScript/Vite-Produktionsbuild erfolgreich.
- Vor Play-Upload: Capacitor Sync, Android Release Bundle mit R8, Signaturvergleich mit dem bisherigen Upload-Zertifikat, Google-Play-Upload und gesonderte Eintragung nur im internen Test.
- Im internen Test optisch prüfen: App-Launcher, Android adaptive Iconform, Parola-Anmeldung, Kopfzeile und Favicon, falls als PWA/Web verwendet.
- Play Console Store Listing/Icon ist eine getrennte Einstellung und wird mit diesem App-Bundle nicht automatisch geändert.
- Produktiv-Freigabe erst nach echtem Gerätetest; Android-15-Edge-to-edge-Warnung separat bearbeiten.
