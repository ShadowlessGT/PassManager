# Sign the PAROLA Android release AAB with DPAPI CurrentUser and verify upload identity.
# This script never echoes credentials or puts them on the command line.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$gradleFile = Join-Path $root 'android\app\build.gradle'
$source = Join-Path $root 'android\app\build\outputs\bundle\release\app-release.aab'
$outDir = Join-Path $PSScriptRoot 'out'
$vault = Join-Path $env:LOCALAPPDATA 'ShadowlessPlayAutomation\parola-signing.dpapi.json'
$jarsigner = Join-Path $env:JAVA_HOME 'bin\jarsigner.exe'
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
$expectedSha1 = '541D17691DE2793AB4370B829B014B9A73AF8506'
foreach ($file in @($gradleFile,$source,$vault,$jarsigner,$keytool)) {
  if (!(Test-Path -LiteralPath $file)) { throw ('Release prerequisite missing: ' + $file) }
}
$gradleText = [IO.File]::ReadAllText($gradleFile)
$codeMatch = [regex]::Match($gradleText, '(?m)^\s*versionCode\s+(\d+)\s*$')
$nameMatch = [regex]::Match($gradleText, '(?m)^\s*versionName\s+"(\d+(?:\.\d+)+)"\s*$')
if (!$codeMatch.Success -or !$nameMatch.Success) { throw 'Cannot parse the Android release version.' }
$code = [int]$codeMatch.Groups[1].Value
$name = $nameMatch.Groups[1].Value
if ($code -lt 20) { throw 'Refusing to sign an obsolete PAROLA release.' }
$dest = Join-Path $outDir ('Parola-v' + $name + '-vc' + $code + '-SIGNED.aab')
$data = Get-Content -LiteralPath $vault -Raw -Encoding UTF8 | ConvertFrom-Json
if ($data.format -ne 1 -or $data.alias -ne 'parola' -or $data.certificateSha1 -ne $expectedSha1) {
  throw 'DPAPI metadata does not match the existing PAROLA upload identity.'
}
if (!(Test-Path -LiteralPath $data.keyStore)) { throw 'Original shared keystore not found.' }
if (Test-Path -LiteralPath $dest) {
  if ((Get-Item $dest).LastWriteTimeUtc -lt (Get-Item $source).LastWriteTimeUtc) {
    throw 'Signed AAB exists but is older than the current build. Change versionCode and rebuild.'
  }
  Write-Output ('ALREADY_SIGNED=' + $dest)
} else {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
  $store = ConvertTo-SecureString $data.storePasswordDPAPI
  $key = ConvertTo-SecureString $data.keyPasswordDPAPI
  $b1 = [IntPtr]::Zero
  $b2 = [IntPtr]::Zero
  try {
    $b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($store)
    $b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
    $env:PAROLA_RELEASE_STORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1)
    $env:PAROLA_RELEASE_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2)
    $ErrorActionPreference = 'Continue'
    & $jarsigner -keystore $data.keyStore -storepass:env PAROLA_RELEASE_STORE_PASSWORD -keypass:env PAROLA_RELEASE_KEY_PASSWORD -digestalg SHA-256 -sigalg SHA256withRSA -signedjar $dest $source parola
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($exitCode -ne 0) { throw 'AAB signing failed; the key password may differ.' }
  } finally {
    Remove-Item Env:PAROLA_RELEASE_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PAROLA_RELEASE_KEY_PASSWORD -ErrorAction SilentlyContinue
    if ($b1 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b1) }
    if ($b2 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2) }
    $store = $null; $key = $null
  }
}
$ErrorActionPreference = 'Continue'
& $jarsigner -verify $dest | Out-Null
$verifyExit = $LASTEXITCODE
$cert = @(& $keytool -printcert -jarfile $dest 2>&1)
$certExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($verifyExit -ne 0 -or $certExit -ne 0) { throw 'Signed AAB verification failed.' }
$shaMatch = [regex]::Match(($cert -join [Environment]::NewLine), '(?i)\bSHA1:\s*([0-9A-F:]+)')
if (!$shaMatch.Success -or $shaMatch.Groups[1].Value.Replace(':','').ToUpperInvariant() -ne $expectedSha1) {
  throw 'The AAB was signed with the wrong certificate.'
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($dest)
try {
  if (!@($zip.Entries | Where-Object { $_.FullName -match '^META-INF/[^/]+\.(RSA|DSA|EC)$' }).Count) {
    throw 'AAB signature block missing.'
  }
  $plugin = $zip.GetEntry('base/assets/capacitor.plugins.json')
  if (!$plugin) { throw 'Capacitor plugins manifest missing.' }
  $reader = New-Object IO.StreamReader($plugin.Open())
  try { $json = $reader.ReadToEnd() } finally { $reader.Dispose() }
  if (!$json.Contains('@capacitor-firebase/authentication')) {
    throw 'Native Firebase Authentication plugin missing from release AAB.'
  }
} finally { $zip.Dispose() }
Write-Output ('SIGNED_AAB=' + $dest)
Write-Output ('SIGNED_SHA256=' + (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash.ToLowerInvariant())
Write-Output ('SIGNATURE_MATCHES_PREVIOUS_PAROLA_UPLOAD=TRUE')
