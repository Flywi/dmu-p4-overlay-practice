param([switch]$Test, [string]$Output = 'bin/P4Overlay.exe')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:GOPATH = Join-Path $PSScriptRoot '.cache\gopath'
$env:GOMODCACHE = Join-Path $PSScriptRoot '.cache\gomod'
$env:GOCACHE = Join-Path $PSScriptRoot '.cache\go-build'
$env:npm_config_cache = Join-Path $PSScriptRoot '.cache\npm'
$env:npm_config_registry = 'https://registry.npmjs.org'
if (-not (Test-Path -LiteralPath 'assets/app.ico')) {
    & powershell -NoProfile -File tools/build-icon.ps1
    if ($LASTEXITCODE -ne 0) { throw 'Icon generation failed' }
}
Copy-Item -LiteralPath 'assets/app.svg' -Destination 'frontend/app-icon.svg' -Force
if (-not (Test-Path -LiteralPath 'frontend/node_modules/vue/package.json')) {
    & npm ci --prefix frontend --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed' }
}
& npm run build --prefix frontend
if ($LASTEXITCODE -ne 0) { throw 'Vue frontend build failed' }
if (-not (Test-Path -LiteralPath 'resource_windows_amd64.syso') -or (Get-Item 'assets/app.ico').LastWriteTimeUtc -gt (Get-Item 'resource_windows_amd64.syso').LastWriteTimeUtc) {
    & go run github.com/akavel/rsrc@v0.10.2 -ico assets/app.ico -arch amd64 -o resource_windows_amd64.syso
    if ($LASTEXITCODE -ne 0) { throw 'Windows icon resource generation failed' }
}
if ($Test) {
    foreach ($script in Get-ChildItem -LiteralPath 'frontend' -Filter '*.js' -File) {
        & node --check $script.FullName
        if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed: $($script.Name)" }
    }
    $frontendTests = @(Get-ChildItem -LiteralPath 'frontend' -Filter '*.test.js' -File | ForEach-Object FullName)
    & node --test $frontendTests
    if ($LASTEXITCODE -ne 0) { throw 'Mechanic tests failed' }
    & go test ./...
    if ($LASTEXITCODE -ne 0) { throw 'Shared state tests failed' }
    & go vet ./...
    if ($LASTEXITCODE -ne 0) { throw 'Go vet failed' }
}
New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot 'bin') | Out-Null
& go build -tags production -trimpath -ldflags '-s -w -H windowsgui' -o $Output .
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
$localeOutput = Join-Path (Split-Path -Parent $Output) 'locales'
New-Item -ItemType Directory -Force -Path $localeOutput | Out-Null
foreach ($localeName in @('zh-CN.json','en-US.json')) {
    $localeTarget = Join-Path $localeOutput $localeName
    if (-not (Test-Path -LiteralPath $localeTarget)) {
        Copy-Item -LiteralPath (Join-Path 'frontend/locales' $localeName) -Destination $localeTarget
    }
}
Copy-Item -LiteralPath 'tools/release-readme.md' -Destination (Join-Path (Split-Path -Parent $Output) 'README.md') -Force
Write-Host "Built $Output"
