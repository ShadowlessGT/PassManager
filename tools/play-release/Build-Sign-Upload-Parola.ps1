# PAROLA: local QA, Android build, DPAPI signing and Google Play upload.
# Open testing release is gated by explicit QA approval. Never touches production or GitHub Actions.
param(
  [switch]$CheckOnly,
  [switch]$Upload,
  [switch]$PublishOpenTest,
  [switch]$QaApproved
)
$ErrorActionPreference = 'Stop'
if ($CheckOnly -and ($Upload -or $PublishOpenTest)) { throw 'Choose either CheckOnly or Upload/Publish.' }
if ($PublishOpenTest -and (!$Upload -or !$QaApproved)) {
  throw 'Open testing requires -Upload -PublishOpenTest -QaApproved after real-device Google-login QA.'
}
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$vault = Join-Path $env:LOCALAPPDATA 'ShadowlessPlayAutomation\parola-signing.dpapi.json'
$uploader = Join-Path $PSScriptRoot 'Upload-Parola-Play.py'
$signer = Join-Path $PSScriptRoot 'Sign-Parola-AAB.ps1'
$openTest = Join-Path $PSScriptRoot 'Release-Parola-Open-Test.py'
$gradle = Join-Path $root 'android\gradlew.bat'
if (!(Test-Path -LiteralPath $gradle)) { throw 'Android Gradle wrapper missing.' }
Write-Output 'PAROLA: refresh Firebase Android Google OAuth configuration'
& python (Join-Path $PSScriptRoot 'Refresh-Parola-Firebase-Config.py')
if ($LASTEXITCODE -ne 0) { throw 'PAROLA Firebase SDK config refresh failed. No bundle built or uploaded.' }
# Fail closed if Google Play/Firebase certificate registration or Google provider are broken.
& python (Join-Path $PSScriptRoot 'Check-Parola-Google-Firebase.py')
if ($LASTEXITCODE -ne 0) { throw 'PAROLA Google/Firebase auth preflight failed. No bundle uploaded.' }
if ($CheckOnly) {
  & python $uploader --check
  if ($LASTEXITCODE -ne 0) { throw 'Google Play preflight failed.' }
  exit 0
}
if (!(Test-Path -LiteralPath $vault)) { throw 'PAROLA DPAPI signing not configured.' }
Push-Location $root
try {
  Write-Output 'PAROLA: local regression tests'
  & npm.cmd test -- --reporter=dot
  if ($LASTEXITCODE -ne 0) { throw 'Local regression tests failed.' }
  Write-Output 'PAROLA: TypeScript and production web build'
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
  Write-Output 'PAROLA: Capacitor sync'
  & npx.cmd cap sync android
  if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
  Write-Output 'PAROLA: Android release bundle'
  Push-Location (Join-Path $root 'android')
  try {
    & $gradle ':app:bundleRelease' '--no-daemon' '--console=plain'
    if ($LASTEXITCODE -ne 0) { throw 'Gradle release build failed.' }
  } finally { Pop-Location }
  Write-Output 'PAROLA: DPAPI sign and verify release identity'
  & powershell.exe -NoProfile -NonInteractive -File $signer
  if ($LASTEXITCODE -ne 0) { throw 'AAB sign/verify failed. Play upload not attempted.' }
  if ($Upload) {
    Write-Output 'PAROLA: upload unassigned AAB to Google Play'
    & python $uploader --upload
    if ($LASTEXITCODE -ne 0) { throw 'Google Play bundle upload failed.' }
    Write-Output 'PAROLA_SIGNED_AAB_UPLOADED_UNASSIGNED=TRUE'
    if ($PublishOpenTest) {
      Write-Output 'PAROLA: explicitly QA-approved open-testing release'
      & python $openTest --publish --qa-approved
      if ($LASTEXITCODE -ne 0) { throw 'Google Play upload completed, but open-test promotion failed.' }
    }
  } else {
    Write-Output 'PAROLA_SIGNED_AAB_PREPARED=TRUE'
  }
} finally {
  Pop-Location
}
