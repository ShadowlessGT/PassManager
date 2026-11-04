# Parola: Google Play Store listing uploader

Status 2026-11-04: OAuth scope configured. Dedicated service account created. Google Play Console app permission still missing (HTTP 403). No Play Store content uploaded.

## One-time Play Console action
Sign in to https://play.google.com/console/ as the Play developer account.
Go to Users and permissions and invite this service account:
parola-play-listings@password-manager-parola.iam.gserviceaccount.com

Grant access ONLY to Parola (com.shadowlessstudios.passwordmanager) with:
- View app information and download bulk reports (read-only)
- Manage store presence

Do NOT grant broad release or finance permissions. No service account private key is stored locally.

## Prepared assets
Directory: H:\Meine Ablage\Sharing\Parola-PlayStore-EN
- store-texts/localizations.json: 20 translated titles, short and full descriptions.
- Parola-Google-Play-Icon-512.png: 512x512 (en-US only).
- Seven files *_EN.png: 1080x1920 English phone screenshots (en-US only).
- PREVIEW.html: preview gallery.
- UPLOAD_TO_PLAY.cmd: performs --check, then --upload.

## Commands (run from PassManager repository)
node scripts/play-store-upload.mjs --check
node scripts/play-store-upload.mjs --probe
node scripts/play-store-upload.mjs --upload

The uploader creates a Play edit, updates all supported localizations, replaces the en-US icon and phone screenshots only, verifies the edit and commits it. It does not upload AAB files or release an app to production. After success it records play-upload-report.json in the media folder.

Actual status: Local check passed 20 locales, 7 screenshots and 1 icon. API probe 403 until the service account is invited to Parola in Google Play Console.
