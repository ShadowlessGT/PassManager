# Parola Ultra – Google Play Billing release setup

Status: Code and local tests implemented; **NOT YET LIVE**.
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
- Current Cloud Functions have a temporary `enforceAppCheck:false` for Play callables until Android Play Integrity App Check is ready. This is a release security item, not an assertion that App Check has been configured.
- Offline app vault continues working without Firebase or Google Play; publishing does not require buying Ultra.

## Manual configuration prerequisites – DO NOT SKIP

1. **Play Console:** Create free Android app with package `com.shadowlessstudios.passwordmanager`. Configure Play App Signing, add signed release AAB through *internal testing* and add a license tester. An unsigned AAB or debug APK is not a release.
2. **Product:** Under Monetization / In-app products create and activate **one-time** product `parola_ultra_lifetime`. Set real price, supported regions and offer. A product not yet available to the tester will not display a buy offer.
3. **Google Play Developer API:** API `androidpublisher.googleapis.com` was enabled in Google Cloud project `password-manager-parola` on 28 Oct 2026. In Play Console **API access**, link the correct Google Cloud project and authorize the Cloud Functions runtime service account to access *orders and subscriptions* as required for purchase inspection and acknowledgement. Verify the runtime identity used by Functions Gen2. Never put a Google service-account JSON key into Android, web, Git or the FTP site.
4. **Firebase billing:** `password-manager-parola` currently has **no billing account**. Cloud Functions require Blaze. Several open Google Cloud billing accounts exist, and none was selected. Explicitly select/approve which account may be linked before doing so. Consider budgets, alerts, maxInstances and cost controls.
5. **Deploy Cloud Functions:** Once billed and Play Console API access granted, from local repo:
   `firebase deploy --only functions:verifyPlayPurchase,functions:refreshPlayEntitlement,functions:deleteOwnAccount,functions:redeemGiftCode,functions:adminCreateGiftCodes --project password-manager-parola`
   First set `PASSMANAGER_REDEMPTION_HMAC_KEY` as a Firebase Secret and the correct Admin claim for gift-code functions; otherwise deploy Play-only and deletion callables separately.
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

Passing unit/build/emulator tests does not verify a Google Play test transaction, a live Function, app deletion, or a signed Google Play release. No actual purchases or cloud billing account were created in this phase.
