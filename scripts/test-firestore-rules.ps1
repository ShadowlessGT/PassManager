$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
if(!(Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))){throw 'Android Studio JDK 21 fehlt'}
$env:PATH=(Join-Path $env:JAVA_HOME 'bin')+';'+$env:PATH
Set-Location $root
& firebase.cmd emulators:exec --project demo-parola-rules --config firebase.emulator.json --only firestore 'node scripts/test-firestore-rules.mjs'
if($LASTEXITCODE -ne 0){throw ('Firestore emulator tests failed: '+$LASTEXITCODE)}
Write-Output 'FIRESTORE_RULES_TESTS_OK'
