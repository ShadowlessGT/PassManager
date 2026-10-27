param([switch]$Publish)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
if (!(Test-Path '.\deploy.local.env')) {
    Write-Error 'deploy.local.env fehlt. deploy.local.env.example kopieren und ausfüllen.'
    exit 1
}
Write-Host 'Building isolated Parola website...' -ForegroundColor Cyan
& npm.cmd run build:site
if ($LASTEXITCODE -ne 0) { throw 'Website build failed' }
$args = @('scripts/deploy-site.py')
if ($Publish) { $args += '--publish' }
& python @args
if ($LASTEXITCODE -ne 0) { throw 'Deployment failed' }
