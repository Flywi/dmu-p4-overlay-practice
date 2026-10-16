param([string]$Output = 'dist/P4Overlay-windows-x64.zip')

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

# Explicit inputs keep caches, old builds and local settings out of the download.
$requiredFiles = @(
    'bin/P4Overlay.exe',
    'bin/locales/zh-CN.json',
    'bin/locales/en-US.json',
    'bin/README.md'
)
foreach ($file in $requiredFiles) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Missing package input: $file. Run build.ps1 first."
    }
}

$outputPath = [IO.Path]::GetFullPath((Join-Path $projectRoot $Output))
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null
Compress-Archive -LiteralPath 'bin/P4Overlay.exe','bin/locales','bin/README.md' -DestinationPath $outputPath -Force
Write-Host "Packaged $outputPath"
