# Parola 0.7.10 / VC 27 – Ultra, Geschenkcodes & Google Play Billing (interner Test)

## Stand 2026-11-16

- Ausgangspunkt: `main` mit Parola 0.7.9 / VC 26.
- Neues Test-Release: 0.7.10 / VC 27, ausschließlich intern.
- Google Play One-Time-Product: `parola_ultra_lifetime`, Kaufoption `standard` von `DRAFT` auf **`ACTIVE`** per Android Publisher API umgestellt. Preise unverändert: Deutschland 4,99 EUR, US 4,69 USD, Türkei 284,99 TRY; regional konfiguriert für 174 Regionen.
- Play API aus zentralem Shadowless Studios Service Account erfolgreich gelesen und aktiviert.
- Im Firebase-Auth-Projekt `password-manager-parola` wurde dem verifizierten, bereits vorhandenen Google-basierten Eigentümer-Konto der Claim `passmanagerAdmin: true` zugewiesen. Andere Claims bleiben erhalten; Login-ID-Token bei Adminansicht jetzt mit `getIdTokenResult(user,true)` erneuert.
- Keine Freischaltcodes wurden ohne Benutzeranweisung generiert oder offen gelegt; Codes können in der App als Administrator erzeugt und anschließend mit beliebigen aktiven Firebase-Konten eingelöst werden.

## App-Änderungen

1. **Free-Bilder**: Neue Bilder/Anhänge dürfen nur noch durch Ultra hinzugefügt werden, sowohl per Editor-UI als auch im servergebundenen lokalen Save-Gate. Bereits importierte Bilder bleiben für Free sichtbar und können entfernt werden. Bestehende Tresore werden nicht verändert.
2. **Freischalt-/Kaufmenü**: `LicensePanel` wird in beiden Modi (einfach und Experte) angezeigt, nicht nur in Experte.
3. **Ultra-Lizenzstatus**: Kauf-/Geschenkcodeaktualisierung refreshen dieselbe UI; bei aktiver Ultra-Lizenz kein erneuter Kaufbutton.
4. **Billing-Kaufbutton**: `VITE_PLAY_BILLING_ENABLED=true` wurde ausschließlich in der lokalen, nicht eingecheckten `.env.local` dieses Test-Worktrees aktiviert. Alle anderen Versionen bleiben unberührt. Android liest den lokalisierten Preis weiterhin ausschließlich von Google Play.
5. **Fail-closed Kaufprüfung**: Vor dem Kauf fordert die App `billingReadiness` von Firebase Functions an. Diese Funktion fragt unter der echten Cloud-Functions-Runtime-Identität eine synthetische (ungültige) Kauf-Tokenkennung bei Google Play ab. Nur wenn Google Play eine autorisierte `400`/`404`-Antwort liefert, wird Kaufen freigegeben. `401`/`403` und Netzwerkprobleme führen zu `ready:false`. Die Funktion hält die positive/negative Antwort fünf Minuten im serverseitigen Cache, ruft keine echten Käufe ab und vergibt keine Berechtigungen.
6. Google Play `verifyPlayPurchase`, `refreshPlayEntitlement`, `redeemGiftCode` und `adminCreateGiftCodes` waren schon vorhanden. Die neue Bereitschaftsprüfung ist ein zusätzlicher Schutz; sie ersetzt nicht den E2E-Kaufnachweis.
7. **Backend**: 13 Node.js-Tests bestanden, einschließlich `400/404` readiness, `401/403` fail-closed, 503 und bestehender Kauf-, Erstattungs- und Geschenkcode-Regeln.
8. **Frontend**: 101 Vitest-Tests und Vite/TypeScript-Build erfolgreich.

## Noch nicht als fertig/produktionsreif interpretieren

- Google Play Service Account für Release-/Produktmanagement und Firebase Functions `693424731365-compute@developer.gserviceaccount.com` sind **unterschiedliche Identitäten**. Die Anwendungsberechtigungen der Firebase-Runtime für Google Play Order/Purchase API konnten extern nicht nachgewiesen werden.
- Ein temporärer IAM-TokenCreator-Zugriff, ausschließlich zur Diagnose, wurde **vollständig wieder entfernt**. Keine dauerhaften zusätzlichen IAM-Berechtigungen.
- Vor Production sind echte Android-Play-Lizenztestkäufe (keine echten Zahlungen), verifizierte Freischaltung, Kauf-Wiederherstellung, Pending/Cancel, Erstattung und ggf. Remote-Refund-Events zu testen.
- App Check ist in der bislang veröffentlichten Konfiguration noch nicht erzwungen; Cloud Functions verlangen Firebase Auth, Giftcode-Admin zusätzlich custom claim. Bei Produktion Native-App-Attest und App Check validieren.
- Store-Produkt ist ACTIVE. Dies aktiviert allein **nicht** den Kaufbutton in 0.7.8/0.7.9, deren Builds weiterhin Billing disabled enthalten.
- Keine automatische Produktion/Open-Test-Hochstufung ohne E2E-Kaufprüfung.

## Testablauf

1. Interne Google-Play-Version 0.7.10 (VC 27) aus Play installieren und mit dem bestehenden verifizierten Firebase-Google-Konto anmelden.
2. Einstellungen im einfachen Modus → Parola Ultra & Freischaltcodes öffnen. Das Adminfeld sollte erscheinen.
3. Zunächst ohne reale Geldzahlung prüfen, ob die neue serverseitige `billingReadiness` den Kaufbutton aktiviert. Falls gesperrt: Firebase-Laufzeit-Servicekonto **in Play Console** mit app-spezifisch `View financial data` und `Manage orders and subscriptions` berechtigen; keinen persönlichen oder zentralen SA-Schlüssel in die App legen.
4. Lizenztester in Google Play Console hinterlegen, Testzahlung über Play-Testzahlungsmethode durchführen; nie eine echte Zahlung in QA erzwingen.
5. Nach Play `PURCHASED` prüfen: Kauf-Token wird nur serverseitig bestätigt, Ultra aktiviert; danach auf demselben und anderem Gerät `Käufe wiederherstellen` testen.
6. Ohne Testzahlung: Admin erzeugt einen einmaligen Freischaltcode und löst ihn auf einem Testkonto ein (Test-Entitlements bleiben von Google Play Käufen getrennt).
7. Free-Account kann neue Bilder nicht hinzufügen, vorhandene importierte Bilder bleiben sichtbar. Neue Bilder nach Ultra-Aktivierung testweise hinzufügen.
