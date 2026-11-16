# Parola 0.7.12 (29) – Öffentlicher Google-Play-Release

Datum: 16.11.2026

## Veröffentlichung

- Version: **Parola 0.7.12 (VersionCode 29)** aus dem freigegebenen, auf `main` zusammengeführten Build.
- SHA256 des signierten Android App Bundles: `cdead274b290cb02f7f0deb30ceadb1ee8fc0dba6fed8a9dcbecf24b5107a83e`.
- Nutzerauftrag zur Veröffentlichung am 16.11.2026 ausdrücklich erteilt.
- Google Play Developer API meldet `edits:validate` und `edits:commit` als erfolgreich.
- Live-Readback des Produktions-Tracks: `29 / inProgress / userFraction = 0.10`, zusätzlich `24 / completed` als bisherige Fallback-Version.
- Interner Test-Track weiterhin VC29, offener Test-Track weiterhin VC20, nicht verändert.
- Receipt: `tools/play-release/out/parola-production-staged-vc29.json` (lokal, von Git ignoriert).
- Veröffentlichungs-Skript: `tools/play-release/Release-Parola-Production-Staged-vc29.py`. Es ist auf diesen konkreten Release und vorherige Track-Zustände festgelegt und **kein generischer 100-%-Release-Befehl**.

## Freigabestand

Der Rollout ist **öffentlich, aber gestaffelt auf 10 %**. Google Play kann einige Stunden benötigen, bis die App bei diesen Nutzern angeboten wird. Eine Erweiterung auf 100 % erfordert eine separate Freigabe und eine weitere Play-API-Track-Änderung.

## QA vor einer Erweiterung

- Realer Login/Speichervorgang des optionalen Android-Autofill-Dienstes in unterstützten Apps.
- Google-Play-Lizenz-Testkauf mit Wiederherstellung, einschließlich Abbruchfällen.
- Absturz- und ANR-Rate, Supportmeldungen und Kategorienraster auf kleinen Displays.
- Falls ein Problem auftritt, den `inProgress`-Rollout in der Play Console anhalten, statt blind auf 100 % zu erhöhen.

Die Benutzerpasswörter und lokale Tresordaten wurden während des Releases nicht geöffnet oder verarbeitet.
