param([switch]$Publish, [switch]$Probe)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
if ($Publish -and $Probe) { throw 'Publish und Probe können nicht gemeinsam ausgeführt werden.' }
if (-not $Probe) {
    Write-Host 'Parola-Website wird lokal gebaut ...' -ForegroundColor Cyan
    & npm.cmd run build:site
    if ($LASTEXITCODE -ne 0) { throw 'Website-Build fehlgeschlagen.' }
}
$args = @('scripts/deploy-site.py')
if ($Publish) { $args += '--publish' }
if ($Probe) { $args += '--probe' }
& python @args
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Tipp: DEPLOY_SITE.cmd setup öffnet die lokale FTP-Konfiguration.' -ForegroundColor Yellow
    exit 1
}
