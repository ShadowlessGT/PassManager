# Shadowless Studios – weltweite Sprachstrategie

## Langfristiger Standard

Bei neuen Apps wird die Sprachauswahl **nicht** ausschließlich nach der Größe der Muttersprachgemeinschaften priorisiert. Entscheidend ist die zusätzliche Anzahl *unterschiedlicher Personen*, die die Benutzeroberfläche lesen und verstehen können.

Berücksichtige dafür: Muttersprachler (L1), ausreichende Zweit- und Fremdsprachenkenntnisse (L2), Schrift- und Lesekompetenz, tatsächliche Smartphone-/App-Nutzung, geografische Abdeckung, regionale Varianten, Sicherheitsterminologie und laufende Wartungskosten.

Wichtig: Sprecherzahlen sind keine disjunkten Mengen. Wer Englisch und Französisch kann, darf bei der Reichweitenrechnung nicht doppelt gezählt werden. Eine neue Sprache kann trotz hoher reiner Sprecherzahl wenig zusätzlichen Nutzen bringen, wenn die Zielgruppe bereits eine bestehende Sprache ausreichend versteht. Umgekehrt kann eine regionale Sprache mit niedrigerer Sprecherzahl einen hohen Wert haben, wenn Englisch dort wenig verbreitet oder der Zugang zu sicherheitskritischen Begriffen unzureichend ist.

**Niemals behaupten**, eine Sprache sei auf Basis von L1+L2-Zahlen allein eindeutig höher priorisiert. Eine reale Nettoreichweite erfordert Mehrsprachigkeits- und Nutzungsdaten; Schätzungen sind als solche auszuweisen.

## Ausgangskatalog für Parola

Englisch (`en`), Mandarin vereinfacht (`zh-Hans`), Hindi (`hi`), Spanisch (`es`), Arabisch (`ar`), Französisch (`fr`), Bengalisch (`bn`), Portugiesisch (`pt`), Indonesisch (`id`), Urdu (`ur`), Russisch (`ru`), Deutsch (`de`), Japanisch (`ja`), Vietnamesisch (`vi`), Suaheli (`sw`), Türkisch (`tr`), Tamil (`ta`), Koreanisch (`ko`), Persisch (`fa`), Thailändisch (`th`).

Diese 20 sind eine bewusste internationale **Ausgangsauswahl**, keine unveränderliche statistische Top 20. Für künftige Erweiterungen Marathi, Telugu, Filipino, Italienisch, Polnisch und andere Sprachen erneut bewerten. Regionale Varianten wie `zh-Hant`, `pt-BR`, `pt-PT` und `es-419` können zusätzliche Lokalisierungen brauchen. Eine andere Schrift (Traditional Chinese) darf nicht als identisch zur vereinfachten behandelt werden.

## Technische Regeln

- Standard: Automatisch (Gerätesprache); bei fehlender Unterstützung klare Ersatzsprache.
- Sprache ohne Neustart umschalten, im Einfach- und Expertenmodus.
- Auswahl lokal als unsensible UI-Präferenz speichern; niemals in verschlüsselte Tresor-, Login- oder Passworteinträge eingreifen.
- Sprachoptionen mit Eigenbezeichnung anzeigen.
- Stabile Übersetzungsschlüssel statt direktem Texteingriff in Benutzerdaten.
- Falls eine Übersetzung fehlt: expliziten Fallback und QA-Kennzeichnung, **niemals unvollständige Sprachen als fertig bewerben**.
- Auch Start-/Entsperrbildschirm, Formulare, Fehler, Import, Cloud, Sicherheit, Kontolöschung und Google Play Billing einbeziehen.
- Sicherheits- und Zahlungswarnungen von Muttersprachlern oder qualifizierten Übersetzern prüfen lassen.
- `<html lang>`, `dir=rtl`, längere Texte, Unicode, Screenreader, Tastatur und Zahlen-/Datums-/Währungsformate testen.
- Nutzerdefinierte Daten (Passwörter, Eintragsnamen, Notizen, E-Mail-Adressen, Websites) bleiben *unübersetzt*.
- Bei jeder neuen App-Funktion Übersetzungsschlüssel, Sprachdateien und automatisierte Tests im selben Release ergänzen.

## Implementierungsstand: Phase 1 (November 2026)

- Der aktuelle Katalog in `src/i18n.ts` enthält einen vollständig besetzten **Grundwortschatz** für alle 20 Sprachen.
- Erkennung, manuelle Auswahl, persistente Einstellungen und RTL-Basis sind implementiert.
- Noch nicht alle bisherigen deutschen Bildschirmtexte wurden migriert. Die Sprachen sind daher **noch nicht produktionsweit vollständig**.
- Der UI-Hinweis zum noch laufenden Übersetzungsprozess wird erst entfernt, wenn alle Screens und Sicherheitsmeldungen vollständig übersetzt und getestet sind.
