## Parola Original-Branding (v0.6.5)
- Original-Icon: `public/parola-icon.png`, Launcher-Quellen: `assets/icon.png` und `assets/logo.png`.
- Original-Wortmarke: `public/parola-wordmark.png`.
- Farbe: Kobaltblau und Cyan, mit hellem und dunklem Systemtheme.
- Sichtbarer Name: `Passwort Manager: Parola`; Android-ID unveraendert `com.shadowlessstudios.passwordmanager`.

## Parola Android-ID und Firebase (26.10.2026)

- App-Name: Passwort Manager: Parola; Android-Paket / Capacitor appId: `com.shadowlessstudios.passwordmanager`.
- Firebase-Projekt: `password-manager-parola`. Android-App muss auf exakt diese Paket-ID registriert sein.
- Lokale Firebase-Quelle: `H:\Meine Ablage\GoogleServicess Firebase\Parola\google-services.json`.
- Android-Konfiguration: `android/app/google-services.json` (gitignored); Web-Konfiguration: `.env.local` (gitignored).
- Android-Installationen mit `eu.shadowlessstudios.passmanager` oder `com.chilleristudios.passwortmanager` sind **separate Apps**; ihre lokalen Passwortdaten werden nicht automatisch migriert. Vor Deinstallation immer ein verifiziertes verschluesseltes Backup/Restore testen.
- APK lokal auf dem Windows-PC erstellen; keine GitHub Actions.

## v0.6.1 – System detection without a visible third theme
- On first launch, auto-detect and follow Android light/dark mode.
- Appearance settings offer only **Hell** and **Dunkel**. The auto-detected effective choice is shown as selected.
- Tapping either option stores a persistent override. Prior to an override, later device changes remain automatic.
- Internal preference "system" remains the default for backward compatibility and does not appear as a visible theme selection.
- All APK builds remain local: no GitHub Actions.

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

## v0.6.0 – Accessible appearance and locale release plan
- System/Light/Dark themes, default follows current Android setting and updates when it changes. New explicit light palette; neutral charcoal dark palette.
- Font size for Simple mode: Normal / Groß / Sehr groß; starts in Simple with Groß. All preferences stored locally, no vault schema change.
- Category editing in Simple: name first, optional colors/icons hidden until expanded.
- Documentation: \`docs/ACCESSIBILITY_AND_LOCALIZATION.md\` provides older-adult UX acceptance criteria and the exact **20 target** locales.
- **Important:** 20 complete installed-app translations do **not** exist yet. The German strings still embedded in React must be extracted and translated before advertising 20 supported languages. This build implements theme/accessibility foundations, not multilingual release completion.
- No GitHub Actions: build locally only on owner PC/Bridge.

## v0.5.0 – Accessible Simple mode, neutral dark design, six-character minimum

- **New vault creation** accepts a master password of at least **6 characters** (was 12), while prominently recommending **12+ characters** and warning in the setup form about the higher risk of short master passwords. The two confirmation fields must still match. This does not weaken the existing PBKDF2/AES-256-GCM encryption format, but shorter human-chosen master passwords are significantly easier to guess if encrypted vault data are obtained.
- Existing vaults remain compatible; the policy is applied to **new vault setup**, not unlocking an existing vault.
- **Simpler initial setup**: familiar German language, ability to show/hide the password, readable explanation and unobtrusive guidance.
- **Simple mode designed for nontechnical/older users**: larger touch targets, obvious copy button labels, three clear form steps, optional categories hidden until requested, readable font sizes, prominent "Neues Passwort speichern" button. Switching to Expert mode retains full editing, fields and analytics.
- **True dark theme**: charcoal/neutral surfaces with a restrained teal-gray accent instead of purple glows and violet highlights. Individually selected category colors remain supported.
- **No GitHub Actions**. Run local npm, Vitest, Capacitor/Gradle via authorized owner Bridge / Android Studio and place a debug test APK in \`H:\\Meine Ablage\\Sharing\\APKs\`.

**Security:** 6-character master passwords are *allowed*, not *recommended*. Users should favor a unique 12+ character password or long passphrase and use biometric unlock for convenience. Cloud sync with Google/OneDrive is a separately tracked future feature, not part of this build.

## v0.4.0 – Simple/Expert UX and configurable auto-lock

- **Simple mode** is the new default: large, clear actions, fast name/username/password entry and an optional category picker. Extra fields, image attachments, Insights, sharing and advanced settings remain available in Expert mode. Switching modes does not delete or transform vault entries. UI mode is a device-local preference, not a change to the encrypted vault schema.
- **Two independent local lock timers**, editable under Settings → Unlock: how long the unlocked app may remain in the background (immediate / 1 / 5 / 10 / 15 / 30 / 60 minutes) and how long it may stay idle while open (1 / 5 / 10 / 15 / 30 / 60 minutes). Defaults: **5-minute background**, **15-minute foreground idle**. Persisted preference contains no secret. Native Capacitor App lifecycle events and document visibility changes cover Android and web. Explicit Lock always acts immediately. An OS-killed process cannot safely retain an in-memory master key; relaunch requires biometric or master-password unlock.
- **Categories are independent folders/labels**: create an empty category without creating a password, choose an icon and color, and assign a category by tapping a chip in Quick Add or the entry editor. Renaming updates all assignments; deleting removes only the label, **never** the credentials. Legacy vaults with string-only categories are supported without destructive migrations. New/edited entries register new labels in the encrypted vault.
- Android's app package is versionCode 4, versionName 0.4.0 so a debug build can be installed over v0.3.0 when signed with the same debug key.
- **No GitHub Actions** or workflow runs. For testing and building, use \`BUILD_ANDROID.cmd\` through the owner's authorized local Bridge or run it on their Windows PC. Install dependencies with \`npm install\`, run \`npm run build\` and \`npm test\`, then \`npx cap sync android\` followed by Gradle \`assembleDebug\`. This version adds \`@capacitor/app\` for native lifecycle notifications.

### Important security behavior

An unlocked vault keeps the encryption key in memory until explicitly or automatically locked. Extending the background timeout increases the opportunity for unauthorized access while the device is unlocked. Default timeouts are conservative, and a longer background duration is an explicit user choice. These settings are local-only; passwords and category metadata are part of the encrypted vault. After force-stop, reboot or process eviction, reopening must still require secure authentication. Test app switching, app kill, device lock and biometric unlock with **dummy credentials** on a real Android device.


## v0.3.0 – quick capture, encrypted insights and on-device OCR

This feature branch includes:
- **Quick Add**: short form with name, username and password. Local secure generator and optional advanced editor. Vault still saves only encrypted data.
- **Insights**: encrypted local counters for opening an entry, copying a specific field type and revealing a secret, plus per-category distribution, most-used field types, local duplicate-password detection and a basic strength heuristic.
- **Password history**: if the user opts in for an entry, up to ten previous main passwords are retained inside the encrypted vault. They are hidden until explicitly revealed, can be copied or cleared, and appear in the entry detail screen.
- **Gallery / camera OCR**: choose a saved image or take a photo in Android; bundled ML Kit text recognition processes the photo on-device. Label-based extraction suggests values for name, username, email, URL, password and PIN. It **does not save automatically**: the user must review the suggestions in the editor. A temporary copy in app Cache is removed after processing. Browser OCR is explicitly unavailable.
- Device PIN/password/biometrics remain supported as before, while the rest of the vault stays local-first.

IMPORTANT: OCR can misread passwords (e.g., 0 vs O) and must not be trusted without visual verification. Screenshots stored in the phone gallery remain in the gallery until the user removes them; the app does not automatically delete source images.

**No GitHub Actions.** Automated workflows have been removed at the user's request. Use local tooling:

~~~sh
npm install
npm run build
npm test
node --check functions/index.js
npx cap add android       # Only once, if Android directory doesn't already exist
npx cap sync android
npx cap open android
~~~

The new OCR plugin uses the locally bundled ML Kit Latin-script model and increases the APK size. This dependency has not been independently audited. Android camera/photo selection and ML Kit MUST be tested on a real device before anyone imports actual secrets.

Insights note: opening an entry is counted when tapped, and a copy count records a successful clipboard write; neither proves use of the credential to sign in. The password analyzer checks only the primary password field, not PINs or custom secret fields. It performs no network leak checks, does not expose duplicates' secret values and includes only heuristic strength scores. Analytics become available only after upgrading to this release; older history cannot be reconstructed.

Password histories increase the impact of any compromise of an unlocked vault. History is opt-in and disabled by default; users can clear it from an entry or Insights. For production, add authenticated reveal and add authentication before revealing old secrets. Never upload analytics or secrets unencrypted.


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
