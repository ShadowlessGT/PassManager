# Parola – Kompakter Tresor, Kategorie-Raster und Sortierung

Stand: 16.11.2026. Branch: feat/parola-compact-vault-grid-sort-20261116.

## Anpassungen

- Tresor: Suche direkt nach der Überschrift, Eintragsliste beginnt deutlich früher. Dekorative Begrüßungskarte aus der Tresorhauptseite entfernt.
- Sicherheitscenter über kompakte Schaltfläche mit Score erreichbar. Zusatzaktionen hinter dem aufklappbaren Bereich "Weitere Aktionen", primäre Neu-Schaltfläche bleibt sichtbar.
- Tresor, Favoriten und Kategorieneinträge: Zuletzt hinzugefügt, Meist geöffnet, Zuletzt geändert (Datum), Alphabetisch (A–Z). Datenfelder: createdAt, activity.opens, updatedAt.
- Kategorien: Liste oder 1-, 2- oder 3-spaltiges Kachelraster – auch auf dem Handy einstellbar. Öffnen und Bearbeiten bleiben erreichbar.
- Kategorien: die gleichen Sortierarten. Häufigkeit = Summe der Öffnungen zugeordneter aktiver Einträge.
- Neue Kategorien erhalten optionale Erstellungs- und Änderungszeitpunkte. Bei alten Kategorien ohne Zeitstempel wird das jüngste zugeordnete Erstellungsdatum als historische Näherung verwendet.
- Sortierung, Spaltenzahl und aufklappbare Zusatzaktionen als lokale Anzeigepräferenzen, keine Veränderungen an Passwörtern oder deren Verschlüsselung.

## Verifikation

- Ausgangspunkt Parola 0.7.11 einschließlich Android-Autofill Save-only.
- Paralleles Eintragseditor-Update aus origin/main (cb3d10e) übernommen.
- 123 Vitest-Tests aus 31 Dateien bestanden.
- TypeScript und Vite-Produktionsbuild erfolgreich.
- Kein Zugriff auf echte Tresordaten; keine Änderung von Play Tracks, keine OTA-Veröffentlichung.

## Grenzen

- Ein echter mobiler UI-Sichttest ist noch offen. Sehr lange Kategorienamen können bei drei Spalten umbrechen.
- Bei Gleichständen wird alphabetisch sortiert; die gespeicherten Tresoreinträge werden dabei nicht umsortiert oder neu verschlüsselt.
- Die neue UI wird erst mit dem nächsten ausgelieferten Android- oder kompatiblen Web-/OTA-Update auf Nutzergeräten sichtbar.
