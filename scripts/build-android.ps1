param([switch]$OpenStudio,[switch]$SkipInstall)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$studio='C:\Program Files\Android\Android Studio\bin\studio64.exe'
$jbr='C:\Program Files\Android\Android Studio\jbr'
$sdk=Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$appVersion=(Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$destination=Join-Path 'H:\Meine Ablage\Sharing\APKs' ("Parola-v" + $appVersion + "-debug.apk")
function Stage([string]$name,[scriptblock]$action){
  Write-Host ('['+(Get-Date -Format 'HH:mm:ss')+'] '+$name)
  & $action
  if($LASTEXITCODE -ne 0){throw "$name failed (exit code $LASTEXITCODE)"}
}
Write-Host 'Parola LOCAL Android build (NO GitHub Actions)'
if(!(Get-Command npm.cmd -ErrorAction SilentlyContinue)){
  if(Get-Command winget -ErrorAction SilentlyContinue){
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  }
  throw 'Install Node.js and restart the terminal to refresh PATH.'
}
if(!(Test-Path $jbr) -or !(Test-Path $sdk)){
  if(!(Test-Path $studio) -and (Get-Command winget -ErrorAction SilentlyContinue)){
    winget install -e --id Google.AndroidStudio --accept-package-agreements --accept-source-agreements
  }
  throw 'Android Studio SDK or Java runtime is missing. Configure SDK via Android Studio and rerun.'
}
$env:JAVA_HOME=$jbr;$env:ANDROID_HOME=$sdk;$env:ANDROID_SDK_ROOT=$sdk
$env:PATH=(Join-Path $jbr 'bin')+';'+$env:PATH
if(!$SkipInstall){ Stage 'Restore NPM dependencies' {npm.cmd install --no-audit --no-fund --prefer-offline} }
Stage 'Compile React frontend' {npm.cmd run build}
Stage 'Run vault unit tests' {npm.cmd test}
Stage 'Check Firebase callable syntax' {node.exe --check functions/index.js}
if(!(Test-Path (Join-Path $root 'android\gradlew.bat'))){
  Stage 'Generate native Android project' {npx.cmd cap add android}
}
Stage 'Capacitor full refresh sync' {npx.cmd cap sync android}
Push-Location (Join-Path $root 'android')
try {Stage 'Build Android debug APK' {.\gradlew.bat assembleDebug --no-daemon}}
finally {Pop-Location}
$source=Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
if(!(Test-Path $source)){throw 'Gradle returned without generating the expected APK'}
$folder=Split-Path $destination -Parent
New-Item -ItemType Directory -Path $folder -Force|Out-Null
Copy-Item -LiteralPath $source -Destination $destination -Force
Write-Host ('APK_READY='+$destination)
Write-Host ('APK_SHA256='+(Get-FileHash $destination -Algorithm SHA256).Hash)
if($OpenStudio -and (Test-Path $studio)){Start-Process $studio -ArgumentList ('"'+(Join-Path $root 'android')+'"')}
