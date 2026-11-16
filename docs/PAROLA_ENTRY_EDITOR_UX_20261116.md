# Parola – Eintragseditor: Kategorien, Bilder und Symbole (16.11.2026)

## Anlass
Manuelles UI-Feedback aus dem Android-internen Test von 0.7.11 (VC28):
- Eine neu angelegte Kategorie beim Bearbeiten eines Eintrags erscheint nicht sofort dauerhaft im Kategorieverzeichnis.
- Bilder hinzufügen ist am unteren Ende eines langen Bearbeitungsformulars versteckt; Free-Nutzer brauchen direkten, verständlichen Ultra-Freischaltzugang.
- Ausgewählte Eintragssymbole sollen in der Eintragsliste **direkt vor dem Eintragsnamen** sichtbar sein.

## Umsetzung
1. CategoryPicker: Die Schaltfläche „Neue Kategorie“ ruft nun eine explizite asynchrone Speicheraktion auf. Die Kategorie wird sofort getrennt vom späteren Speichern des Eintrags im verschlüsselten Tresor registriert. Der neue Kategoriename wird erst nach erfolgreichem Schreiben automatisch ausgewählt. Fehler bleiben sichtbar. Identische Namen werden case-insensitiv abgeglichen.
2. QuickAdd (Einfach/Experte) und EntryEditor nutzen dieselbe persistente Erstellaktion. Das Abbrechen des Eintrags löscht keine bereits ausdrücklich erstellte Kategorie.
3. EntryEditor: Direkt oben erscheint eine kompakte Bildergalerie mit vorhandenen Vorschaubildern, „+ Bild hinzufügen“, Entfernung und 12er-Anzeige. Derselbe vorhandene Uploadprozess mit Dateityp-, Größen- und Anzahl-Prüfung wird benutzt. Der untere ausführliche Bilderbereich bleibt erhalten.
4. Ohne Ultra öffnet die Bilderkachel einen fokussierbaren Kauf-Dialog mit der existierenden Google-Play-Kauf- und Geschenkcodeintegration. Die Kaufansicht wurde reduziert (keine technischen Admin- und Zahlungs-Erklärtexte), ohne die Servervalidierung oder Free-Anhang-Beschränkung zu umgehen. Kaufdialog liegt außerhalb des Eintragsformulars; ein Tastatur-Enter kann daher nicht ungewollt den Eintrag speichern. Ungespeicherte Eingaben bleiben während des Kaufs im Editor erhalten.
5. Die Eintragssymbol-Auswahl ist eine visuelle, zugängliche Icon-Kachelgruppe statt einer bloßen Text-Dropdown-Liste; die Auswahl zeigt das SVG.
6. In der Passwortliste wird das gewählte Symbol direkt **vor dem Namen** gezeigt. Auch die Eintragsdetailansicht zeigt es beim Namen. Das bestehende Vorschaubild bleibt als Avatar sichtbar und wird nicht durch das Symbol verdrängt. Unbekannte importierte Icon-IDs bleiben erhalten; aktuell nicht verfügbare Symbole verwenden das Standard-Piktogramm.

## Prüfungen
- 112 Vitest-Tests, 30 Testdateien: bestanden, einschließlich neuer Kategorie-/Icon-/Bild-Vorrang-Regressionstests.
- TypeScript und Vite-Build: erfolgreich.
- Capacitor-Sync und Android Debug-APK: erfolgreich.
- Release-konforme `.env.local` wurde nur im ignorierten Entwicklungsordner für den Test-Build eingebunden; `VITE_PLAY_BILLING_ENABLED=true`, keine Schlüssel im Commit.
- Originale Android-Gradle-Konfigurationsdateien werden nach Capacitor-Sync aus dem Git-Index wiederhergestellt.
- Keine Firebase-Produktivdaten gelesen oder modifiziert.

## Freigabe
Diese Änderungen sind zunächst **Quellcode-/Entwicklungsstand**; das bereits hochgeladene Android-App-Bundle 0.7.11 / VC28 ist unveränderlich. Die neuen UI-Funktionen werden erst mit einem neuen Build oder gesondert abgesichertem OTA-Update auf Endgeräten sichtbar.
Für den nächsten Play-Release neue Version / VersionCode vergeben, Kaufdialog und Kategorie-Speicherweg auf Android praktisch testen. Keine automatische Play-Promotion während Nutzerprüfung.
