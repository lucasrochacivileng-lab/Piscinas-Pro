[CmdletBinding()]
param(
  [string]$OutputRoot = (Join-Path $PSScriptRoot "..\backups"),
  [string]$DatabaseUrl = $env:POOLSTRUCT_DATABASE_URL,
  [switch]$Linked
)

$ErrorActionPreference = "Stop"
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupDirectory = [System.IO.Path]::GetFullPath((Join-Path $OutputRoot $timestamp))

if (Test-Path -LiteralPath $backupDirectory) {
  throw "O destino de backup ja existe: $backupDirectory"
}
if ($Linked -and $DatabaseUrl) {
  throw "Use -Linked ou POOLSTRUCT_DATABASE_URL, nunca os dois."
}
if (-not $Linked -and -not $DatabaseUrl) {
  throw "Informe -Linked ou defina POOLSTRUCT_DATABASE_URL."
}

New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$npx = (Get-Command npx.cmd -ErrorAction Stop).Source
$connection = if ($Linked) { @("--linked") } else { @("--db-url", $DatabaseUrl) }
$env:NODE_OPTIONS = "--use-system-ca"
$env:SUPABASE_TELEMETRY_DISABLED = "1"

function Invoke-Dump([string[]]$DumpArguments) {
  & $npx --yes supabase db dump @connection @DumpArguments
  if ($LASTEXITCODE -ne 0) {
    throw "supabase db dump falhou. O backup em $backupDirectory esta incompleto."
  }
}

$rolesPath = Join-Path $backupDirectory "roles.sql"
$schemaPath = Join-Path $backupDirectory "schema.sql"
$dataPath = Join-Path $backupDirectory "data.sql"

Invoke-Dump @("--file", $rolesPath, "--role-only")
Invoke-Dump @("--file", $schemaPath)
Invoke-Dump @(
  "--file", $dataPath,
  "--data-only",
  "--use-copy",
  "--exclude", "storage.buckets_vectors",
  "--exclude", "storage.vector_indexes"
)

$files = @("roles.sql", "schema.sql", "data.sql") | ForEach-Object {
  $path = Join-Path $backupDirectory $_
  $item = Get-Item -LiteralPath $path
  [ordered]@{
    name = $_
    bytes = $item.Length
    sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}

$manifest = [ordered]@{
  formatVersion = 1
  product = "POOLSTRUCT"
  createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
  source = if ($Linked) { "linked-project" } else { "database-url" }
  files = $files
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $backupDirectory "manifest.json") -Encoding utf8

Write-Host "Backup logico concluido e verificado em $backupDirectory"
Write-Host "Copie este diretorio para armazenamento criptografado e fora do ambiente primario."
