param([switch]$Publish, [switch]$Probe)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

if ($Publish -and $Probe) { throw 'Publish und Probe koennen nicht gemeinsam ausgefuehrt werden.' }

if (-not $Probe) {
    # Git clones/pulls contain sources but no npm dependencies.
    # Install locked development dependencies automatically if Vite is missing.
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Node.js/npm fehlt. Bitte Node.js LTS installieren und die CMD erneut starten.'
    }
    $vite = Join-Path $root 'node_modules\.bin\vite.cmd'
    if (-not (Test-Path -LiteralPath $vite)) {
        if (-not (Test-Path -LiteralPath (Join-Path $root 'package-lock.json'))) {
            throw 'package-lock.json fehlt. Bitte das vollstaendige Parola-Repository pullen.'
        }
        Write-Host '[Parola] Vite fehlt. Installiere npm-Abhaengigkeiten aus package-lock.json ...' -ForegroundColor Yellow
        & npm.cmd ci --include=dev --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            throw 'npm ci fehlgeschlagen. Bitte npm-Fehler oben pruefen (Netzwerk/Node.js).'
        }
        if (-not (Test-Path -LiteralPath $vite)) {
            throw 'Vite fehlt auch nach npm ci. Bitte Node.js/npm-Version pruefen.'
        }
    }
    Write-Host '[Parola] Website wird lokal gebaut ...' -ForegroundColor Cyan
    & npm.cmd run build:site
    if ($LASTEXITCODE -ne 0) { throw 'Website-Build fehlgeschlagen.' }
}

$deployArgs = @('scripts/deploy-site.py')
if ($Publish) { $deployArgs += '--publish' }
if ($Probe) { $deployArgs += '--probe' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'Python wurde nicht gefunden. Bitte Python installieren und in PATH aufnehmen.'
}
# Password-based SFTP uses Paramiko. Install only when the local config selects SFTP;
# the uploader itself still performs strict SSH host-key fingerprint verification.
$config = Join-Path $root 'deploy.local.env'
if ((Test-Path -LiteralPath $config) -and
    (Select-String -Path $config -Pattern '^\s*HOSTINGER_FTP_PROTOCOL\s*=\s*sftp\s*
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Tipp: DEPLOY_SITE.cmd setup oeffnet die lokale FTP-Konfiguration.' -ForegroundColor Yellow
    exit 1
}
 -Quiet)) {
    $paramikoInstalled = & python -m pip show paramiko 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host '[Parola] SFTP benoetigt Paramiko. Installiere Python-Paket einmalig ...' -ForegroundColor Yellow
        & python -m pip install --user 'paramiko>=3.5,<5' --disable-pip-version-check
        if ($LASTEXITCODE -ne 0) {
            throw 'Paramiko-Installation fehlgeschlagen. Bitte Python/pip pruefen.'
        }
    }
}
& python @deployArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Tipp: DEPLOY_SITE.cmd setup oeffnet die lokale FTP-Konfiguration.' -ForegroundColor Yellow
    exit 1
}
