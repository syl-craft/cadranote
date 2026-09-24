$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageFiles = @(
  'manifest.json',
  'background.js',
  'content.js',
  'page-inspector.js',
  'unavailable.html',
  'help.css',
  'icons'
) | ForEach-Object { Join-Path $projectRoot $_ }

Compress-Archive -LiteralPath $packageFiles -DestinationPath (Join-Path $projectRoot 'Cadranote.zip') -Force
Write-Output 'Archive Cadranote.zip : fichiers Chrome uniquement.'
