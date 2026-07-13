[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$source = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$localRoot = [System.IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA "poolstruct"))
$target = [System.IO.Path]::GetFullPath((Join-Path $localRoot "verify"))

if (-not $target.StartsWith($localRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Destino temporario fora do diretorio permitido: $target"
}

if (Test-Path -LiteralPath $target) {
  Remove-Item -LiteralPath $target -Recurse -Force
}

New-Item -ItemType Directory -Path $target -Force | Out-Null
& robocopy $source $target /E /XD .git node_modules dist coverage tmp | Out-Null
if ($LASTEXITCODE -ge 8) {
  throw "Falha ao copiar o projeto para validacao (robocopy: $LASTEXITCODE)."
}

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$env:NODE_OPTIONS = "--use-system-ca"
Push-Location $target
try {
  & $npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci falhou." }
  & $npm test
  if ($LASTEXITCODE -ne 0) { throw "Testes falharam." }
  & $npm run check
  if ($LASTEXITCODE -ne 0) { throw "Checagem TypeScript falhou." }
  & $npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build falhou." }
} finally {
  Pop-Location
}

Write-Host "POOLSTRUCT validado com sucesso em $target"

