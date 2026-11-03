# Parola Ultra – Google Play Billing release setup

Status (2026-11-03): **Firebase backend LIVE** (all five v2 callables active in europe-west3); **Google Play checkout NOT YET ENABLED** pending Play Console product/API permissions and an actual internal-track purchase test.
App ID: `com.shadowlessstudios.passwordmanager`.
Product ID: `parola_ultra_lifetime` (must match Android + Firebase).
Product type: **one-time non-consumable in-app product**. Do not create a paid second app, subscription or consumable product.
Google Play Billing Library: **9.1.0** (Android native Capacitor plugin).

## Code and safety guarantees

- Google Play determines localized product price; never hardcode prices or purchase success in the app.
- User signs in to Firebase Authentication before purchase, and the BillingFlow binds the Google purchase to a SHA256 obfuscation of the Firebase UID.
- Android sends purchase token to `verifyPlayPurchase` (Firebase Functions, europe-west3). This calls Android Publisher API productsv2, checks SKU, PURCHASED state and account binding.
- Cloud Function acknowledges purchased products through the official Play API; Firebase transaction grants Ultra and blocks token reuse by another account.
- `refreshPlayEntitlement` rechecks ownership, and removes previously Play-issued grants when Google reports an invalid/canceled purchase (while preserving admin gifts).
- `playPurchases` and `playTokensByUser` are not accessible to clients in Firestore rules. User tokens are only saved server-side; no Google API credentials ship in the app.
- Android restores purchased products via `queryPurchasesAsync`; non-PURCHASED/PENDING items cannot activate Ultra.
- In-app purchase button defaults to **disabled** until `VITE_PLAY_BILLING_ENABLED=true` in local `.env.local`. Set it only when backend is deployed and a successful closed-track license test purchase has been verified.
- Current Cloud Functions have a temporary `enforceAppCheck:false` for all callables until Android Play Integrity App Check is ready. All callables require Firebase Authentication; gift-code creation additionally requires an admin claim. This is a release security item, not an assertion that App Check has been configured.
- Offline app vault continues working without Firebase or Google Play; publishing does not require buying Ultra.

## Manual configuration prerequisites – DO NOT SKIP

1. **Play Console:** Create free Android app with package `com.shadowlessstudios.passwordmanager`. Configure Play App Signing, add signed release AAB through *internal testing* and add a license tester. An unsigned AAB or debug APK is not a release.
2. **Product:** Under Monetization / In-app products create and activate **one-time** product `parola_ultra_lifetime`. Set real price, supported regions and offer. A product not yet available to the tester will not display a buy offer.
3. **Google Play Developer API:** API `androidpublisher.googleapis.com` is enabled in Google Cloud project `password-manager-parola`. In Play Console **API access**, link the correct Google Cloud project and authorize the Cloud Functions runtime service account to access *orders and subscriptions* as required for purchase inspection and acknowledgement. Verify the runtime identity used by Functions Gen2. Never put a Google service-account JSON key into Android, web, Git or the FTP site.
4. **Firebase billing COMPLETED (2026-11-03):** `password-manager-parola` was explicitly approved and linked to **Mein Rechnungskonto** (`01A058-E41A2A-D7B91C`); `billingEnabled=true` verified through Google Cloud CLI. Blaze is usage-based. A monthly budget/alerts have **not yet been configured**. Do not attach another billing account without authorization.
5. **Firebase Functions LIVE (2026-11-03):** `verifyPlayPurchase`, `refreshPlayEntitlement`, `deleteOwnAccount`, `redeemGiftCode`, `adminCreateGiftCodes` all verified **ACTIVE** on Node.js 22 in `europe-west3`. Google Secret Manager secret `PASSMANAGER_REDEMPTION_HMAC_KEY` version 1 is enabled and bound to both gift functions. Runtime identity: `693424731365-compute@developer.gserviceaccount.com`. Artifact Registry `gcf-artifacts` (europe-west3) has a **7-day automatic cleanup policy**. All five endpoints refused unauthenticated POST requests with HTTP 401. Authenticated production E2E tests are **not** yet performed. The gift-code admin custom claim is **not yet verified as assigned**. For future deployments:
   `firebase deploy --only functions --project password-manager-parola --non-interactive`
6. **App Check:** Register the Android app in Firebase App Check using Play Integrity and its signing certificate SHA-256. Test genuine tokens in internal testing before enforcing App Check on Firestore/Auth/Functions. Not verified live yet.
7. **Production data, website & policy:** Complete legal controller/privacy/support details, web account-deletion end-to-end testing, Play data-safety form, full encrypted backup/restore testing, refund handling, Play Store screenshots and content questionnaire.
8. **Release switch:** With backend live and test purchases successful, add `VITE_PLAY_BILLING_ENABLED=true` to your local `.env.local`, build a new signed AAB, upload internal track, repeat purchase/restore/pending/cancel/refund/account deletion tests before production release. Do not enable flag in publicly shipped build before backend.
9. **RTDN:** For immediate refund/revocation updates independent of user sign-in, configure Google Play Real-Time Developer Notifications to Pub/Sub with a trusted server handler; currently app refreshes on Firebase account session. This is recommended before broad public release.

## Local checks

```powershell
npm ci --include=dev
npm test
npm run build
npm run test:rules
npm --prefix functions ci
npm --prefix functions run check
npm --prefix functions test
npx cap sync android
cd android
.\gradlew.bat :app:assembleDebug
```

## Signer

Reference: `docs/SIGNING.md`. Existing shared Keystore path is local. Keep actual keystore passwords outside Git and do not overwrite another app's alias.

## Disclaimers

Unit/build tests and unauthenticated live smoke tests do **not** verify a Google Play transaction, successful authenticated Cloud Functions calls, app deletion, refunds, or a signed Play release. No actual purchases were triggered. Cloud billing **is active** by the user's explicit approval as documented above.
