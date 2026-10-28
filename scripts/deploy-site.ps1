param([switch]$Publish, [switch]$Probe)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

if ($Publish -and $Probe) {
    throw 'Publish und Probe koennen nicht gemeinsam ausgefuehrt werden.'
}

if (-not (Get-Command python.exe -ErrorAction SilentlyContinue)) {
    throw 'Python wurde nicht gefunden. Bitte Python installieren und erneut starten.'
}

# git pull transfers source files, but not local npm dependencies.
# Restore Vite from the lockfile only if it is missing.
if (-not $Probe) {
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Node.js/npm fehlt. Bitte Node.js LTS installieren.'
    }
    $vite = Join-Path $root 'node_modules\.bin\vite.cmd'
    if (-not (Test-Path -LiteralPath $vite)) {
        if (-not (Test-Path (Join-Path $root 'package-lock.json'))) {
            throw 'package-lock.json fehlt. Bitte das Parola-Repository aktualisieren.'
        }
        Write-Host '[Parola] Installiere fehlende npm-Abhaengigkeiten ...' -ForegroundColor Yellow
        & npm.cmd ci --include=dev --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'npm ci ist fehlgeschlagen.' }
    }
    Write-Host '[Parola] Website wird lokal gebaut ...' -ForegroundColor Cyan
    & npm.cmd run build:site
    if ($LASTEXITCODE -ne 0) { throw 'Website-Build fehlgeschlagen.' }
}

# SFTP is optional. Only connection/probe/publish requires Paramiko.
$configPath = Join-Path $root 'deploy.local.env'
if (($Publish -or $Probe) -and (Test-Path -LiteralPath $configPath)) {
    $isSftp = Get-Content -LiteralPath $configPath | Where-Object {
        $_.Trim().ToLowerInvariant() -eq 'hostinger_ftp_protocol=sftp'
    } | Select-Object -First 1

    if ($isSftp) {
        & python -m pip show paramiko 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host '[Parola] Installiere SFTP-Bibliothek Paramiko ...' -ForegroundColor Yellow
            & python -m pip install --user 'paramiko>=3.5,<5' --disable-pip-version-check
            if ($LASTEXITCODE -ne 0) { throw 'Paramiko-Installation fehlgeschlagen.' }
        }
    }
}

$arguments = @('scripts/deploy-site.py')
if ($Probe) { $arguments += '--probe' }
if ($Publish) { $arguments += '--publish' }

& python @arguments
if ($LASTEXITCODE -ne 0) {
    Write-Host '[Parola] Deployment fehlgeschlagen. FTP/SFTP-Einstellungen mit Menuepunkt 1 pruefen.' -ForegroundColor Yellow
    exit 1
}
exit 0
