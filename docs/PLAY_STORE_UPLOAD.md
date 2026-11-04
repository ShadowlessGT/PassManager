# Parola: Google Play Store Upload

Status 2026-11-04: ALL 20 localized listings and en-US icon/screenshots successfully committed via the Google Play Developer API.
Committed upload report: H:\Meine Ablage\Sharing\Parola-PlayStore-EN\play-upload-report.json

## Central Shadowless Studios Play automation account

shadowless-play-automation@shadowless-bridge.iam.gserviceaccount.com
Google Cloud project: shadowless-bridge
User login: tamergt@googlemail.com (IAM canonical user: tamergt@gmail.com).
Authentication uses the pre-existing short-lived service-account impersonation flow; no downloaded service-account key is required.
Verified: this account has Google Play API access to com.shadowlessstudios.passwordmanager.
Note: account-wide access to every other Play Console app has not been fully audited.

## Prepared materials

- store-texts/localizations.json: 20 Play locale texts.
- Parola-Google-Play-Icon-512.png: 512x512 (en-US).
- Seven *_EN.png: 1080x1920 English phone screenshots (en-US only).
- PREVIEW.html: visual preview. Demo data is fictitious.

## Command in PassManager root

UPLOAD_TO_PLAY.cmd

Or manually:
node scripts/play-store-upload.mjs --check
node scripts/play-store-upload.mjs --probe
node scripts/play-store-upload.mjs --upload

The script normalizes these app-language locale codes to Google Play codes:
id-ID -> id, ur-PK -> ur, vi-VN -> vi, sw-KE -> sw, th-TH -> th.

Only English store graphics are replaced. Other language listings contain text only and fall back to English graphics.
The uploader updates store listings, not AABs, pricing, licenses or public release tracks.
Google Play edits have already been committed for this release. No further manual upload needed unless the content changes.
