# PassManager – secure Android-first password vault

An offline-first password vault, built with React 19, TypeScript, Vite, and Capacitor 8. The **working local MVP** uses the Web Crypto API to encrypt every entry (including names, URLs, notes, and image attachments) before writing to IndexedDB. Firebase is **optional** and only receives an encrypted vault envelope.

> Security status: **development preview, not security-audited**. Do not entrust irreplaceable credentials to a test build. Make independent backups before testing cloud restore.

## Included in v0.1.0

- First-run setup with a master password (minimum 12 characters); password is never sent to Firebase.
- AES-256-GCM authenticated encryption, fresh 96-bit nonce on every save, PBKDF2-HMAC-SHA256 at 600,000 iterations, random 128-bit salt per vault.
- Offline, encrypted IndexedDB vault. Whole vault (including titles, categories and person identifiers) is encrypted.
- Add/edit/delete, search, favorite, multi-category tags, person association, username, email, password, URL, description, free-text comments, 3 encrypted image attachments (JPG/PNG/WebP, max. 500 KB each).
- Password generator, default-hidden password with explicit reveal, quick-copy, safe website links.
- 5-minute inactivity lock and lock when returning after more than 15 seconds in background.
- On supported **native devices only**: optional fingerprint/face/device-PIN-or-pattern prompt; locally backed by secure storage. No fake biometric unlock in browsers.
- Android FLAG_SECURE screenshot/screen-recording protection with official Capacitor Privacy Screen plugin.
- Optional Firebase Email/Password authentication plus **manual** encrypted cloud upload/restore; no unencrypted vault values uploaded.

## Added in v0.2.0 (development branch)

- Optional additional per-item fields, with editable label and type: text, secret, numeric PIN, number, multi-line, email or clickable website. New items start with PIN and address templates. Existing encrypted items remain readable.
- Record creation/last-modified date, plus manually adjustable timestamp for when a password was set or changed. Secret fields keep individual timestamps and are hidden by default.
- CSV (including German semicolon-separated files), Excel XLSX and Bitwarden-style CSV import with first-eight-item preview, duplicate skipping, custom unknown-column preservation, **local-only parsing**, maximum 2 MB / 1000 records.
- Optional Firebase callable endpoints for one-time **free gift codes**, admin-only issuance, hashed codes and server-tracked entitlements. Admin access requires a trusted `passmanagerAdmin` Firebase custom claim. App Check enforcement must be configured on both native and web admin app before deploying endpoints.
- Landing page prototype at `/landing.html` and incomplete *draft* privacy notice at `/privacy.html`; **not legally ready for production**.

### Licensing and pricing

The app remains fully usable as a free **development preview**. This prototype does not yet enforce paid access or process purchases. Do not ship a monetized build without completing verified Google Play Billing integration and testing Play's own promo-code flows.

Use **Google Play Console promotions** for discount/trial campaigns on billed Android products. Do not treat Firebase gifts as an alternate payment method. Firebase gift codes should be issued **without payment** for discretionary access and are separate from Play Billing receipts.

To deploy gift functions: create Firebase project, provision a random 32+-byte secret `firebase functions:secrets:set PASSMANAGER_REDEMPTION_HMAC_KEY`, install `functions/` dependencies, configure Firebase App Check and provision trusted admin via Firebase Admin SDK custom claim (never choose admins by email or client input), then `firebase deploy --only functions,firestore:rules`. Codes cannot be used until the backend, project setup and App Check configuration are complete.

Before shipping: add Play Billing purchase-token verification on the backend, cancellation/refund checks, account linking, secure offline entitlement caching, and a fair path to read/export users' existing vault entries after license expiry. Never lock users out of their own stored secrets.

## Start locally

Requirements: Node.js >= 20, npm, Android Studio + SDK for Android builds.

~~~sh
npm install
npm run dev
~~~

Open the local Vite URL in a supported desktop/mobile browser to test the vault. Browser vault storage is separate from the Android vault and does **not** offer device unlock.

Build and run Android:

~~~sh
npm run build
npx cap add android
npx cap sync android
npx cap open android
~~~

After changes: run \`npm run android:sync\`. For native biometric credentials, configure a secure Android lock screen. Test device unlock and privacy-screen behavior on a physical device before release.

## Firebase (optional)

1. Create a Firebase project and register a Web app (the Capacitor client uses the Firebase Web SDK).
2. Enable Authentication > Email/Password. Create Firestore in production mode.
3. Copy \`.env.example\` to \`.env.local\` and fill in the **public** Firebase web configuration. Never commit service-account JSON, admin SDK credentials, tokens or private keys.
4. Deploy the checked-in \`firestore.rules\` rules to Firestore, for example \`firebase deploy --only firestore:rules\` after setting up the Firebase CLI project.
5. Run \`npm run build\` and \`npx cap sync android\` again.

The **upload** button replaces the previous cloud vault and the **download** button replaces the entire local vault after confirmation. There is **no automatic merge, version reconciliation, background sync, or multi-device conflict handling** yet. A cloud-restored vault must be unlocked using the master password used when that particular vault was encrypted. Restoring disables the old device unlock key.

Firestore documents are limited to ~1 MiB, so cloud upload currently rejects large vaults (client rule threshold 900,000 ciphertext characters). Images are kept in encrypted local vault data and subject to this limit. Future work will move encrypted attachment blobs into dedicated object storage.

## Threat model and limitations

- The master password is never persisted. A key is derived locally. Without the master password **and** no previously enrolled device key, data cannot be recovered.
- Native quick unlock, if explicitly enabled, exports the derived vault key to platform secure storage after successful system biometric/device authentication. This is convenience security; it is **not equivalent to a hardware-bound, authentication-per-read key**. On compromised/rooted devices, secure-storage guarantees weaken.
- Contents are decrypted into process memory while unlocked. A compromised device or malicious OS can read them.
- Clipboard copies may be accessible to other apps. Clipboard is not automatically cleared to avoid destroying other clipboard contents.
- A Firebase account authenticates the user but does not decrypt data; only the locally supplied master password (or native device key) does. Metadata such as auth account, timestamps and document size can still be visible to the cloud provider.
- Losing the master password may cause **permanent data loss**. Password reset cannot decrypt an existing vault.
- The production design should migrate from PBKDF2 to a vetted, memory-hard Argon2id implementation with a versioned KDF envelope after device benchmarks and independent review.
- All cryptography, native unlock, WebView security, Firebase rules, backups, recovery and attachment limits require a security audit and on-device QA before public release.
- Browser CSP and native privacy behavior must be tested. Do not use a development server in a release build.

## Planned (not yet available)

- End-to-end encrypted sharing between users: per-user public keys, signed invitations, wrapped per-item secrets, access revocation and key rotation.
- Robust multi-device sync with versioning, conflict resolution, offline queue and encrypted file objects.
- Android Credential Manager / Autofill integration, passkeys and TOTP support.
- Optional fully native unlock keyed to Android Keystore per-authentication hardware policy, secure device-to-device recovery and biometric lifecycle handling.
- iOS target, accessibility/UX polish, Play Store data safety documents, recovery/export/import and automated release pipeline.

## Repository structure

- \`src/crypto.ts\` – encryption/decryption and key derivation
- \`src/storage.ts\` – encrypted IndexedDB persistence
- \`src/device.ts\` – native secure storage, device authentication, privacy screen
- \`src/cloud.ts\` – optional Firebase backup/restore
- \`src/App.tsx\` – interactive vault UI
- \`firestore.rules\` – account-scoped encrypted-cloud rules

**Do not publish this MVP as a production-grade password manager without a security audit.**
