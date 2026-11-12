# PAROLA Play Release – DPAPI / Shadowless Play Automation

Repository: `N:\Shadowless Studios\Apps\PassManager`

- Upload package: `com.shadowlessstudios.passwordmanager`
- Android release: Gradle `android/app/build.gradle` (`versionCode 20` / `0.7.3` initially)
- Signing keystore: `G:\Meine Ablage\Keystore für Google publishing\ShadowlessStudios.keystore`
- Alias: `parola`; expected Play upload certificate SHA-1: `541D17691DE2793AB4370B829B014B9A73AF8506`
- DPAPI credential: `%LOCALAPPDATA%\ShadowlessPlayAutomation\parola-signing.dpapi.json`
- Auth: impersonated service account `shadowless-play-automation@shadowless-bridge.iam.gserviceaccount.com`
- Output: `tools/play-release/out/Parola-vX.Y.Z-vcN-SIGNED.aab` (Git ignored)

## One-time setup

`powershell.exe -NoProfile -File tools/play-release/Initialize-Parola-Signing.ps1`

If the TAMGA DPAPI vault exists on this Windows account, this uses the **already encrypted** shared ShadowlessStudios keystore password; it validates the PAROLA alias and upload certificate, creates an independent PAROLA DPAPI record, and never creates a plaintext env file. Do not copy the DPAPI file to another user/device.

If shared passwords ever change, use a new one-time importer instead of storing cleartext credentials in the repo.

## Subsequent runs

- Inspect Google Play version and permissions, without publishing: `powershell -NoProfile -File tools/play-release/Build-Sign-Upload-Parola.ps1 -CheckOnly`
- Run 48+ tests, build, sign and verify locally: `powershell -NoProfile -File tools/play-release/Build-Sign-Upload-Parola.ps1`
- Build, sign, **upload unassigned bundle**: `powershell -NoProfile -File tools/play-release/Build-Sign-Upload-Parola.ps1 -Upload`

The uploader *never assigns bundles to open testing or production*. A separate, explicit, QA-approved Play track release is needed. Do not upload untested Google login to public testers; verify Google OAuth provider, Play app-signing SHA-1, Google sign-in on a Play-installed Android build, Firebase-account deletion and preserving the local vault.

Never run GitHub Actions. Never push secrets or include passwords in shell logs.

## One-click commands

- `PAROLA_PLAY_EINMAL_EINRICHTEN.cmd` – einmaliger DPAPI-Import (bereits eingerichtet).
- `PAROLA_PLAY_PRUEFEN.cmd` – Play-Version prüfen, keine Veröffentlichung.
- `PAROLA_PLAY_AAB_HOCHLADEN.cmd` – Tests, Build, Signierung, Upload ohne Trackzuweisung.
- `PAROLA_PLAY_OPEN_TEST_FREIGEBEN.cmd` – nur **nach realem Android-/Google-Login-Test**: vorhandenes Bundle dem offenen Test zuweisen. Keine Produktion.

Nach bestätigter Geräte-QA lässt sich Upload **und** offener Test über `Build-Sign-Upload-Parola.ps1 -Upload -PublishOpenTest -QaApproved` in einem Ablauf durchführen. Neue Releases brauchen einen höheren Gradle `versionCode`.

- `PAROLA_PLAY_INTERN_TEST_FREIGEBEN.cmd` – bereits hochgeladenes AAB in den **internen** Google-Play-Test übernehmen. Offener Test und Produktion bleiben unverändert.
