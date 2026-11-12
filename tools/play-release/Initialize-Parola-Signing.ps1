# PAROLA: import the already encrypted shared-keystore credentials from TAMGA.
# Keeps secrets on this Windows account; never reads plaintext files or prints passwords.
$ErrorActionPreference = 'Stop'
$source = Join-Path $env:LOCALAPPDATA 'ShadowlessPlayAutomation\tamga-signing.dpapi.json'
$target = Join-Path $env:LOCALAPPDATA 'ShadowlessPlayAutomation\parola-signing.dpapi.json'
$expected = '541D17691DE2793AB4370B829B014B9A73AF8506'
$keystore = Join-Path 'G:\Meine Ablage' ('Keystore f' + [char]0x00fc + 'r Google publishing\ShadowlessStudios.keystore')
$keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
if (!(Test-Path -LiteralPath $source)) { throw 'TAMGA DPAPI-Konfiguration fehlt. Keine Daten kopiert.' }
if (!(Test-Path -LiteralPath $keystore)) { throw 'Shadowless-Studios-Keystore fehlt.' }
if (!(Test-Path -LiteralPath $keytool)) { throw 'Android Studio Java keytool fehlt.' }
if (Test-Path -LiteralPath $target) {
  $old = Get-Content -LiteralPath $target -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($old.format -ne 1 -or $old.alias -ne 'parola' -or $old.certificateSha1 -ne $expected) {
    throw 'Vorhandene PAROLA-Konfiguration widerspricht dem erwarteten Upload-Zertifikat.'
  }
  Write-Output 'PAROLA_SIGNING_ALREADY_CONFIGURED=TRUE'
  exit 0
}
$data = Get-Content -LiteralPath $source -Raw -Encoding UTF8 | ConvertFrom-Json
if ($data.format -ne 1 -or !$data.storePasswordDPAPI -or !$data.keyPasswordDPAPI) {
  throw 'TAMGA DPAPI-Konfiguration ist ungültig.'
}
$store = ConvertTo-SecureString $data.storePasswordDPAPI
$key = ConvertTo-SecureString $data.keyPasswordDPAPI
$b1 = [IntPtr]::Zero
$b2 = [IntPtr]::Zero
try {
  $b1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($store)
  $b2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
  $env:PAROLA_SETUP_STORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b1)
  $env:PAROLA_SETUP_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b2)
  $ErrorActionPreference = 'Continue'
  $result = @(& $keytool -list -v -keystore $keystore -alias parola -storepass:env PAROLA_SETUP_STORE_PASSWORD 2>&1)
  $exit = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
  if ($exit -ne 0) { throw 'Keystore-Passwort oder Alias parola ist falsch.' }
  $m = [regex]::Match(($result -join [Environment]::NewLine), '(?i)\bSHA1:\s*([0-9A-F:]+)')
  if (!$m.Success -or $m.Groups[1].Value.Replace(':','').ToUpperInvariant() -ne $expected) {
    throw 'PAROLA-Upload-Zertifikat weicht vom bereits veröffentlichten AAB ab.'
  }
  $vault = [ordered]@{
    format = 1
    alias = 'parola'
    keyStore = $keystore
    storePasswordDPAPI = $data.storePasswordDPAPI
    keyPasswordDPAPI = $data.keyPasswordDPAPI
    certificateSha1 = $expected
    createdUtc = [DateTime]::UtcNow.ToString('o')
    source = 'Existing TAMGA DPAPI credential for shared ShadowlessStudios.keystore'
  }
  $tmp = $target + '.tmp'
  [IO.File]::WriteAllText($tmp, ($vault | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $tmp -Destination $target -ErrorAction Stop
  Write-Output 'PAROLA_DPAPI_CONFIGURED=TRUE'
  Write-Output ('PAROLA_DPAPI_PATH=' + $target)
  Write-Output ('PAROLA_UPLOAD_CERT_SHA1=' + $expected)
} finally {
  Remove-Item Env:PAROLA_SETUP_STORE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PAROLA_SETUP_KEY_PASSWORD -ErrorAction SilentlyContinue
  if ($b1 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b1) }
  if ($b2 -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b2) }
  $store = $null; $key = $null
}
